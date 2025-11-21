// github-storage.js
class GitHubStorage {
    constructor() {
        this.initialized = false;
        this.config = null;
    }

    async init(config) {
        this.config = config;
        this.initialized = true;
        console.log('GitHub Storage инициализирован');
    }

    async loadData() {
        if (!this.initialized) {
            throw new Error('GitHub Storage не инициализирован');
        }

        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/data.json`,
                {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.status === 404) {
                console.log('Файл данных не найден, будет создан новый');
                return null;
            }

            if (!response.ok) {
                throw new Error(`Ошибка загрузки: ${response.status}`);
            }

            const data = await response.json();
            const content = atob(data.content); // Декодируем из base64
            return JSON.parse(content);

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            throw error;
        }
    }

    async saveData(data) {
        if (!this.initialized) {
            throw new Error('GitHub Storage не инициализирован');
        }

        try {
            // Сначала получаем текущий файл чтобы получить SHA (если существует)
            let sha = null;
            try {
                const currentFile = await fetch(
                    `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/data.json`,
                    {
                        headers: {
                            'Authorization': `token ${this.config.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (currentFile.ok) {
                    const fileData = await currentFile.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                console.log('Файл не существует, будет создан новый');
            }

            const content = btoa(JSON.stringify(data, null, 2)); // Кодируем в base64
            const message = `Обновление данных: ${new Date().toLocaleString()}`;

            const response = await fetch(
                `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/data.json`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: message,
                        content: content,
                        sha: sha,
                        branch: this.config.branch
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Ошибка сохранения: ${response.status} - ${errorData.message}`);
            }

            console.log('Данные успешно сохранены на GitHub');
            return await response.json();

        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            throw error;
        }
    }
}

// Создаем глобальный экземпляр
const githubStorage = new GitHubStorage();
