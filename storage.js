// storage.js - Модуль для работы с локальным хранилищем и GitHub
class StorageManager {
    constructor() {
        this.GITHUB_CONFIG = {
            token: localStorage.getItem('githubToken') || '',
            repo: localStorage.getItem('githubRepo') || 'viktor15081985/Transort',
            branch: localStorage.getItem('githubBranch') || 'main'
        };
        
        this.pendingChanges = JSON.parse(localStorage.getItem('pendingChanges')) || [];
        this.isSyncing = false;
        this.syncRetryCount = 0;
        this.MAX_SYNC_RETRIES = 3;
        this.syncRetryTimeout = null;
    }

    // Получение всех данных приложения
    getAllAppData(tableData, users, appSettings, customButtons, customColumns, basicColumns, dateValidationColumns, tabs, currentUser) {
        return {
            tableData,
            users,
            appSettings,
            customButtons,
            customColumns,
            basicColumns,
            dateValidationColumns,
            tabs,
            lastSync: new Date().toISOString(),
            lastEditor: currentUser.username
        };
    }

    // Сохранение всех данных в localStorage
    saveToLocalStorage(tableData, users, appSettings, customButtons, customColumns, basicColumns, dateValidationColumns, tabs) {
        try {
            localStorage.setItem('tableData', JSON.stringify(tableData));
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('appSettings', JSON.stringify(appSettings));
            localStorage.setItem('customButtons', JSON.stringify(customButtons));
            localStorage.setItem('customColumns', JSON.stringify(customColumns));
            localStorage.setItem('basicColumns', JSON.stringify(basicColumns));
            localStorage.setItem('dateValidationColumns', JSON.stringify(dateValidationColumns));
            localStorage.setItem('tabs', JSON.stringify(tabs));
            
            const dataHash = JSON.stringify(tableData) + JSON.stringify(users) + JSON.stringify(appSettings);
            localStorage.setItem('lastDataHash', dataHash);
            
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    }

    // Загрузка всех данных из localStorage
    loadFromLocalStorage() {
        try {
            const tableData = JSON.parse(localStorage.getItem('tableData')) || [];
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const appSettings = JSON.parse(localStorage.getItem('appSettings')) || {};
            const customButtons = JSON.parse(localStorage.getItem('customButtons')) || [];
            const customColumns = JSON.parse(localStorage.getItem('customColumns')) || [];
            const basicColumns = JSON.parse(localStorage.getItem('basicColumns')) || [];
            const dateValidationColumns = JSON.parse(localStorage.getItem('dateValidationColumns')) || {};
            const tabs = JSON.parse(localStorage.getItem('tabs')) || [];
            const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges')) || [];
            
            return {
                tableData,
                users,
                appSettings,
                customButtons,
                customColumns,
                basicColumns,
                dateValidationColumns,
                tabs,
                pendingChanges
            };
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return this.getDefaultData();
        }
    }

    // Данные по умолчанию
    getDefaultData() {
        return {
            tableData: [
                { id: 1, name: 'Проект А', date: '01.10.2023', status: 'Активен', customData: {}, attachments: {} },
                { id: 2, name: 'Проект Б', date: '05.10.2023', status: 'Завершен', customData: {}, attachments: {} },
                { id: 3, name: 'Проект В', date: '10.10.2023', status: 'В процессе', customData: {}, attachments: {} }
            ],
            users: [
                { username: 'admin', password: 'admin', role: 'admin' },
                { username: 'user', password: 'user', role: 'user' }
            ],
            appSettings: {
                headerTitle: 'Основное окно',
                headerLogo: '',
                fixedColumnsCount: 3,
                currentTheme: 'theme-orange'
            },
            customButtons: [],
            customColumns: [],
            basicColumns: [
                { id: 'id', name: '№ п/п', editable: false },
                { id: 'name', name: 'Название', editable: true },
                { id: 'date', name: 'Дата создания', editable: true },
                { id: 'status', name: 'Статус', editable: true }
            ],
            dateValidationColumns: {},
            tabs: [
                { id: 'tab1', name: 'Основное окно', data: null }
            ],
            pendingChanges: []
        };
    }

    // Сохранение в GitHub
    async saveToGitHub(data, currentUser) {
        if (!this.GITHUB_CONFIG.token) {
            throw new Error('GitHub токен не настроен');
        }

        console.log('🔄 Начинаем процесс синхронизации...');

        let content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        
        let sha = null;
        let remoteData = null;
        
        try {
            console.log('📡 Получаем актуальную информацию о файле...');
            const fileInfoResponse = await fetch(`https://api.github.com/repos/${this.GITHUB_CONFIG.repo}/contents/data.json?ref=${this.GITHUB_CONFIG.branch}`, {
                headers: {
                    'Authorization': `token ${this.GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (fileInfoResponse.ok) {
                const fileInfo = await fileInfoResponse.json();
                sha = fileInfo.sha;
                
                const remoteContent = decodeURIComponent(escape(atob(fileInfo.content)));
                remoteData = JSON.parse(remoteContent);
                
                console.log('✅ Текущий SHA:', sha);

                if (currentUser.role === 'admin' && remoteData.lastEditor && 
                    remoteData.lastEditor !== currentUser.username && 
                    remoteData.lastSync > localStorage.getItem('lastSyncTime')) {
                    
                    console.log('⚠️ Обнаружен потенциальный конфликт: данные были изменены другим администратором');
                    
                    return {
                        conflict: true,
                        remoteData: remoteData,
                        sha: sha
                    };
                }
                
                console.log('🔄 Выполняем автоматическое слияние данных...');
                const mergedData = this.mergeData(remoteData, data);
                content = btoa(unescape(encodeURIComponent(JSON.stringify(mergedData, null, 2))));
                
            } else if (fileInfoResponse.status === 404) {
                console.log('📝 Файл не существует, создаем новый');
                sha = null;
            } else {
                const error = await fileInfoResponse.json();
                throw new Error(`Ошибка получения информации о файле: ${error.message}`);
            }
        } catch (e) {
            console.log('⚠️ Ошибка при получении информации о файле:', e.message);
        }

        console.log('💾 Отправляем данные на GitHub...');
        const saveResponse = await fetch(`https://api.github.com/repos/${this.GITHUB_CONFIG.repo}/contents/data.json`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.GITHUB_CONFIG.token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Авто-синхронизация ${new Date().toLocaleString()} (${currentUser.username})`,
                content: content,
                branch: this.GITHUB_CONFIG.branch,
                sha: sha
            })
        });

        if (!saveResponse.ok) {
            const error = await saveResponse.json();
            
            if (error.message && error.message.includes('does not match')) {
                console.log('⚡ Обнаружен конфликт SHA, обновляем данные...');
                return {
                    shaConflict: true,
                    error: error
                };
            }
            
            throw new Error(error.message || 'Ошибка сохранения в GitHub');
        }

        console.log('✅ Успешно сохранено в GitHub');
        localStorage.setItem('lastSyncTime', new Date().toISOString());
        return { success: true };
    }

    // Загрузка из GitHub
    async loadFromGitHub() {
        try {
            console.log('📥 Начинаем загрузку данных из GitHub...');
            
            if (!this.GITHUB_CONFIG.token && !this.GITHUB_CONFIG.repo) {
                throw new Error('Настройки GitHub не настроены');
            }

            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            if (this.GITHUB_CONFIG.token) {
                headers['Authorization'] = `token ${this.GITHUB_CONFIG.token}`;
            }

            const response = await fetch(`https://api.github.com/repos/${this.GITHUB_CONFIG.repo}/contents/data.json?ref=${this.GITHUB_CONFIG.branch}`, {
                headers: headers
            });

            console.log('📡 Статус загрузки:', response.status);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('📝 Файл данных не найден, будет создан при первой синхронизации');
                    return { notFound: true };
                }
                const error = await response.json();
                throw new Error(error.message || `Ошибка загрузки: ${response.status}`);
            }

            const fileInfo = await response.json();
            console.log('✅ Файл найден, размер:', fileInfo.size, 'байт');

            if (!fileInfo.content || fileInfo.size === 0) {
                throw new Error('Файл данных пуст');
            }

            const content = decodeURIComponent(escape(atob(fileInfo.content)));
            
            if (!content || content.trim() === '') {
                throw new Error('Файл данных пуст');
            }

            console.log('🔍 Парсим данные...');
            let data;
            try {
                data = JSON.parse(content);
            } catch (parseError) {
                console.error('❌ Ошибка парсинга JSON:', parseError);
                throw new Error('Файл данных поврежден');
            }

            console.log('✅ Данные успешно загружены');
            return { success: true, data: data };

        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            throw error;
        }
    }

    // Автоматическая синхронизация изменений
    async autoSyncChanges(data, currentUser, updateSyncStatus) {
        if (currentUser && currentUser.role === 'admin') {
            const change = {
                timestamp: Date.now(),
                data: data,
                user: currentUser.username
            };
            
            this.pendingChanges.push(change);
            localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
            
            await this.trySyncChanges(updateSyncStatus);
        }
    }

    // Попытка синхронизации изменений
    async trySyncChanges(updateSyncStatus) {
        if (this.isSyncing || this.pendingChanges.length === 0) return;
        
        this.isSyncing = true;
        updateSyncStatus('Синхронизация...', 'syncing');
        
        const change = this.pendingChanges[0];
        
        try {
            const result = await this.saveToGitHub(change.data, change.user);
            
            if (result.conflict) {
                updateSyncStatus('Обнаружен конфликт данных', 'error');
                return { conflict: true, remoteData: result.remoteData };
            }
            
            if (result.shaConflict) {
                // Повторная попытка после конфликта SHA
                await this.handleShaConflict(change.data, change.user);
            }
            
            this.pendingChanges.shift();
            localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
            this.syncRetryCount = 0;
            
            updateSyncStatus('Синхронизировано: ' + new Date().toLocaleTimeString(), 'success');
            
            if (this.pendingChanges.length > 0) {
                setTimeout(() => this.trySyncChanges(updateSyncStatus), 1000);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            this.syncRetryCount++;
            
            if (this.syncRetryCount <= this.MAX_SYNC_RETRIES) {
                updateSyncStatus(`Ошибка, повтор через ${this.syncRetryCount * 2} сек...`, 'error');
                this.syncRetryTimeout = setTimeout(() => this.trySyncChanges(updateSyncStatus), this.syncRetryCount * 2000);
            } else {
                updateSyncStatus('Ошибка синхронизации', 'error');
            }
            
            return { error: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    // Обработка конфликта SHA
    async handleShaConflict(data, user) {
        // Загружаем актуальные данные и повторяем сохранение
        const loadResult = await this.loadFromGitHub();
        if (loadResult.success) {
            const retryData = {
                ...data,
                tableData: loadResult.data.tableData || data.tableData,
                lastSync: new Date().toISOString()
            };
            
            await this.saveToGitHub(retryData, user);
        }
    }

    // Слияние данных
    mergeData(remoteData, localData) {
        console.log('🔄 Запуск слияния данных...');
        
        const merged = {
            ...remoteData,
            lastSync: new Date().toISOString(),
            mergeOperation: true,
            lastEditor: localData.lastEditor
        };

        // Слияние табличных данных
        if (localData.tableData && remoteData.tableData) {
            console.log('📊 Слияние табличных данных...');
            
            const remoteRows = new Map(remoteData.tableData.map(row => [row.id, row]));
            const localRows = new Map(localData.tableData.map(row => [row.id, row]));
            
            const mergedTableData = [...remoteData.tableData];
            
            localData.tableData.forEach(localRow => {
                const existingIndex = mergedTableData.findIndex(row => row.id === localRow.id);
                if (existingIndex >= 0) {
                    const existingAttachments = mergedTableData[existingIndex].attachments;
                    mergedTableData[existingIndex] = {
                        ...localRow,
                        attachments: { ...existingAttachments, ...localRow.attachments }
                    };
                    console.log(`✏️ Обновлена строка ID: ${localRow.id}`);
                } else {
                    mergedTableData.push(localRow);
                    console.log(`➕ Добавлена новая строка ID: ${localRow.id}`);
                }
            });
            
            merged.tableData = mergedTableData;
            console.log(`✅ Табличные данные объединены: ${mergedTableData.length} строк`);
        }

        // Слияние пользователей
        if (localData.users && remoteData.users) {
            console.log('👥 Слияние пользователей...');
            const userMap = new Map(remoteData.users.map(user => [user.username, user]));
            
            localData.users.forEach(localUser => {
                userMap.set(localUser.username, localUser);
            });
            
            merged.users = Array.from(userMap.values());
            console.log(`✅ Пользователи объединены: ${merged.users.length} пользователей`);
        }

        // Слияние настроек
        if (localData.appSettings) {
            console.log('⚙️ Слияние настроек приложения...');
            merged.appSettings = {
                ...remoteData.appSettings,
                ...localData.appSettings
            };
        }

        // Сохранение пользовательских данных
        if (localData.customButtons) {
            merged.customButtons = localData.customButtons;
        }
        if (localData.customColumns) {
            merged.customColumns = localData.customColumns;
        }

        console.log('🎉 Слияние завершено успешно');
        return merged;
    }

    // Обновление конфигурации GitHub
    updateGitHubConfig(token, repo, branch) {
        this.GITHUB_CONFIG.token = token;
        this.GITHUB_CONFIG.repo = repo;
        this.GITHUB_CONFIG.branch = branch;
        
        localStorage.setItem('githubToken', token);
        localStorage.setItem('githubRepo', repo);
        localStorage.setItem('githubBranch', branch);
        
        return true;
    }

    // Получение текущей конфигурации
    getConfig() {
        return { ...this.GITHUB_CONFIG };
    }

    // Очистка отложенных изменений
    clearPendingChanges() {
        this.pendingChanges = [];
        localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    }

    // Получение статуса синхронизации
    getSyncStatus() {
        return {
            isSyncing: this.isSyncing,
            pendingChanges: this.pendingChanges.length,
            syncRetryCount: this.syncRetryCount
        };
    }
}

// Создаем глобальный экземпляр
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

// Для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
