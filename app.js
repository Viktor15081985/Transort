// Основное приложение Transport System
class TransportSystem {
    constructor() {
        this.storage = new GitHubStorage();
        this.data = null;
        this.init();
    }

    async init() {
        // Ждем загрузки страницы
        setTimeout(async () => {
            this.data = await this.storage.loadData();
            this.setupUI();
            this.setupEventListeners();
            this.renderData();
        }, 100);
    }

    setupUI() {
        // Добавляем кнопки управления
        this.addControlButtons();
    }

    addControlButtons() {
        const style = `
            <style>
                .control-buttons {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    z-index: 1000;
                }
                .control-btn {
                    padding: 12px 20px;
                    border: none;
                    border-radius: 25px;
                    color: white;
                    font-family: Arial;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    transition: all 0.3s;
                }
                .control-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 12px rgba(0,0,0,0.3);
                }
                .sync-btn { background: #2ea44f; }
                .token-btn { background: #6f42c1; }
                .add-btn { background: #007bff; }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', style);

        const buttons = `
            <div class="control-buttons">
                <button class="control-btn sync-btn" onclick="app.syncData()">
                    🔄 Синхронизировать
                </button>
                <button class="control-btn token-btn" onclick="app.manageToken()">
                    🔑 Управление токеном
                </button>
                <button class="control-btn add-btn" onclick="app.showAddMenu()">
                    ➕ Добавить данные
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', buttons);
    }

    async syncData() {
        this.data = await this.storage.forceSync();
        this.renderData();
    }

    async manageToken() {
        const newToken = prompt(
            'УПРАВЛЕНИЕ ТОКЕНОМ:\n\n' +
            'Введите новый токен или оставьте пустым чтобы удалить текущий.\n\n' +
            'Текущий токен: ' + (this.storage.token ? '***' + this.storage.token.slice(-4) : 'не установлен'),
            ''
        );
        
        if (newToken === '') {
            localStorage.removeItem('github_token');
            this.storage.token = null;
            this.storage.showMessage('🗑️ Токен удален', 'info');
        } else if (newToken) {
            localStorage.setItem('github_token', newToken.trim());
            this.storage.token = newToken.trim();
            this.storage.showMessage('✅ Новый токен сохранен', 'success');
        }
    }

    showAddMenu() {
        const type = prompt('Что вы хотите добавить?\n\n1 - Транспорт\n2 - Водителя\n3 - Маршрут', '1');
        
        switch(type) {
            case '1':
                this.addVehicle();
                break;
            case '2':
                this.addDriver();
                break;
            case '3':
                this.addRoute();
                break;
            default:
                alert('Отменено');
        }
    }

    addVehicle() {
        const name = prompt('Название транспорта:');
        const type = prompt('Тип транспорта:');
        const number = prompt('Номер:');
        
        if (name && type && number) {
            if (!this.data.vehicles) this.data.vehicles = [];
            
            this.data.vehicles.push({
                id: Date.now().toString(),
                name: name,
                type: type,
                number: number,
                createdAt: new Date().toISOString()
            });
            
            this.saveData();
        }
    }

    addDriver() {
        const name = prompt('Имя водителя:');
        const phone = prompt('Телефон:');
        const license = prompt('Водительские права:');
        
        if (name && phone) {
            if (!this.data.drivers) this.data.drivers = [];
            
            this.data.drivers.push({
                id: Date.now().toString(),
                name: name,
                phone: phone,
                license: license || '',
                createdAt: new Date().toISOString()
            });
            
            this.saveData();
        }
    }

    addRoute() {
        const from = prompt('Откуда:');
        const to = prompt('Куда:');
        const distance = prompt('Расстояние (км):');
        
        if (from && to) {
            if (!this.data.routes) this.data.routes = [];
            
            this.data.routes.push({
                id: Date.now().toString(),
                from: from,
                to: to,
                distance: distance || '',
                createdAt: new Date().toISOString()
            });
            
            this.saveData();
        }
    }

    async saveData() {
        this.data.lastUpdate = new Date().toISOString();
        await this.storage.saveData(this.data);
        this.renderData();
    }

    deleteVehicle(id) {
        if (confirm('Удалить этот транспорт?')) {
            this.data.vehicles = this.data.vehicles.filter(v => v.id !== id);
            this.saveData();
        }
    }

    deleteDriver(id) {
        if (confirm('Удалить этого водителя?')) {
            this.data.drivers = this.data.drivers.filter(d => d.id !== id);
            this.saveData();
        }
    }

    deleteRoute(id) {
        if (confirm('Удалить этот маршрут?')) {
            this.data.routes = this.data.routes.filter(r => r.id !== id);
            this.saveData();
        }
    }

    setupEventListeners() {
        // Будут добавлены позже для конкретных элементов
    }

    renderData() {
        this.renderSection('vehicles', 'Транспортные средства', this.data.vehicles, 
            item => `${item.name} (${item.type}) - №${item.number}`,
            id => this.deleteVehicle(id)
        );
        
        this.renderSection('drivers', 'Водители', this.data.drivers,
            item => `${item.name} - 📞${item.phone}${item.license ? ' - 🪪' + item.license : ''}`,
            id => this.deleteDriver(id)
        );
        
        this.renderSection('routes', 'Маршруты', this.data.routes,
            item => `🛣️ ${item.from} → ${item.to}${item.distance ? ' (' + item.distance + 'км)' : ''}`,
            id => this.deleteRoute(id)
        );
    }

    renderSection(containerId, title, items, formatItem, deleteHandler) {
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'data-section';
            container.style.cssText = `
                margin: 20px;
                padding: 20px;
                border: 2px solid #ddd;
                border-radius: 10px;
                background: #f9f9f9;
            `;
            
            // Ищем куда вставить
            const main = document.querySelector('main') || document.body;
            main.appendChild(container);
        }
        
        container.innerHTML = `
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
                ${title} 
                <span style="font-size: 14px; color: #666;">
                    (${items ? items.length : 0})
                </span>
            </h2>
            <div id="${containerId}-list">
                ${this.renderItems(items, formatItem, deleteHandler)}
            </div>
        `;
    }

    renderItems(items, formatItem, deleteHandler) {
        if (!items || items.length === 0) {
            return '<p style="color: #666; font-style: italic;">Нет данных</p>';
        }
        
        return items.map(item => `
            <div style="
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                padding: 10px; 
                margin: 5px 0; 
                background: white; 
                border-radius: 5px;
                border-left: 4px solid #007bff;
            ">
                <span>${formatItem(item)}</span>
                <button onclick="app.deleteItem('${item.id}')" 
                        style="
                            background: #dc3545; 
                            color: white; 
                            border: none; 
                            padding: 5px 10px; 
                            border-radius: 3px; 
                            cursor: pointer;
                        ">
                    ❌ Удалить
                </button>
            </div>
        `).join('');
    }

    deleteItem(id) {
        // Находим в каких данных находится этот ID
        if (this.data.vehicles?.find(v => v.id === id)) {
            this.deleteVehicle(id);
        } else if (this.data.drivers?.find(d => d.id === id)) {
            this.deleteDriver(id);
        } else if (this.data.routes?.find(r => r.id === id)) {
            this.deleteRoute(id);
        }
    }
}

// Глобальная переменная для доступа из HTML
let app;

// Запуск приложения когда страница загрузится
document.addEventListener('DOMContentLoaded', function() {
    app = new TransportSystem();
    window.app = app;
});
