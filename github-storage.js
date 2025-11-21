// GitHub Storage System - Простая система хранения данных
class GitHubStorage {
    constructor() {
        this.owner = 'viktor15081985';
        this.repo = 'Transort';
        this.branch = 'main';
        this.dataFile = 'transport-data.json';
        this.token = null;
    }

    async init() {
        this.token = localStorage.getItem('github_token');
        if (!this.token) {
            await this.requestToken();
        }
        return this.loadData();
    }

    async requestToken() {
        return new Promise((resolve) => {
            const token = prompt(
                'ВВЕДИТЕ ВАШ GITHUB ТОКЕН:\n\n' +
                'Это нужно для синхронизации данных между устройствами.\n' +
                'Токен будет сохранен в вашем браузере.',
                ''
            );
            
            if (token && token.trim()) {
                this.token = token.trim();
                localStorage.setItem('github_token', this.token);
                this.showMessage('✅ Токен сохранен!', 'success');
                resolve();
            } else {
                this.showMessage('❌ Токен обязателен для работы', 'error');
                // Продолжаем без токена (оффлайн режим)
                resolve();
            }
        });
    }

    async makeGitHubRequest(url, options = {}) {
        if (!this.token) throw new Error('No token');

        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            ...options
        });

        if (response.status === 401) {
            localStorage.removeItem('github_token');
            this.token = null;
            throw new Error('Invalid token');
        }
        
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return response.json();
    }

    async getFileSHA() {
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            const fileInfo = await this.makeGitHubRequest(url);
            return fileInfo.sha;
        } catch (error) {
            return null;
        }
    }

    async loadData() {
        if (this.token) {
            try {
                const data = await this.loadFromGitHub();
                this.saveToLocalStorage(data);
                this.showMessage('✅ Данные загружены из облака', 'success');
                return data;
            } catch (error) {
                console.warn('Cloud load failed:', error);
            }
        }
        return this.loadFromLocalStorage();
    }

    async loadFromGitHub() {
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            const fileInfo = await this.makeGitHubRequest(url);
            const content = atob(fileInfo.content);
            return JSON.parse(content);
        } catch (error) {
            if (error.message.includes('404')) {
                return this.getDefaultData();
            }
            throw error;
        }
    }

    async saveData(data) {
        this.saveToLocalStorage(data);
        
        if (this.token) {
            try {
                await this.saveToGitHub(data);
                this.showMessage('✅ Данные сохранены в облако', 'success');
            } catch (error) {
                this.showMessage('⚠️ Данные сохранены локально', 'warning');
            }
        } else {
            this.showMessage('💾 Данные сохранены локально', 'info');
        }
    }

    async saveToGitHub(data) {
        const sha = await this.getFileSHA();
        const content = btoa(JSON.stringify(data, null, 2));
        
        const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
        const method = sha ? 'PUT' : 'POST';
        
        const body = {
            message: `Update: ${new Date().toLocaleString('ru-RU')}`,
            content: content,
            branch: this.branch
        };
        
        if (sha) body.sha = sha;
        
        const result = await this.makeGitHubRequest(url, {
            method: method,
            body: JSON.stringify(body)
        });

        if (method === 'POST') {
            this.binId = result.metadata.id;
            localStorage.setItem('jsonbin_bin_id', this.binId);
        }
    }

    saveToLocalStorage(data) {
        localStorage.setItem('transport_data', JSON.stringify(data));
        localStorage.setItem('last_save', new Date().toISOString());
    }

    loadFromLocalStorage() {
        const stored = localStorage.getItem('transport_data');
        if (stored) {
            this.showMessage('📱 Данные загружены локально', 'info');
            return JSON.parse(stored);
        }
        return this.getDefaultData();
    }

    getDefaultData() {
        return {
            vehicles: [],
            drivers: [],
            routes: [],
            lastUpdate: new Date().toISOString()
        };
    }

    showMessage(message, type = 'info') {
        console.log(message);
        
        // Создаем красивую плашку с сообщением
        const msg = document.createElement('div');
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#4CAF50' : 
                        type === 'error' ? '#f44336' : 
                        type === 'warning' ? '#ff9800' : '#2196F3'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial;
            font-size: 14px;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        msg.textContent = message;
        document.body.appendChild(msg);

        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 300);
        }, 3000);
    }

    async forceSync() {
        if (!this.token) {
            await this.requestToken();
        }
        
        try {
            const cloudData = await this.loadFromGitHub();
            const localData = this.loadFromLocalStorage();
            
            const cloudTime = new Date(cloudData.lastUpdate);
            const localTime = new Date(localData.lastUpdate);
            
            if (cloudTime > localTime) {
                this.saveToLocalStorage(cloudData);
                this.showMessage('✅ Синхронизировано с облаком', 'success');
                return cloudData;
            } else if (localTime > cloudTime) {
                await this.saveToGitHub(localData);
                this.showMessage('✅ Локальные данные загружены в облако', 'success');
                return localData;
            } else {
                this.showMessage('✅ Данные актуальны', 'info');
                return localData;
            }
        } catch (error) {
            this.showMessage('❌ Ошибка синхронизации', 'error');
        }
    }
}
