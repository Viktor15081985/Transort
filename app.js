{
  "name": "Transport Data Management System",
  "version": "1.0.0",
  "description": "Система управления транспортными данными с синхронизацией через GitHub",
  "repository": {
    "type": "git",
    "url": "https://github.com/Viktor15081985/Transort"
  },
  "author": "Viktor15081985",
  "license": "MIT",
  "config": {
    "github": {
      "repo": "viktor15081985/Transort",
      "branch": "main",
      "dataFile": "data.json"
    }
  },
  "defaultSettings": {
    "headerTitle": "Основное окно",
    "headerLogo": "",
    "fixedColumnsCount": 3,
    "currentTheme": "theme-orange"
  },
  "defaultData": {
    "tableData": [
      {
        "id": 1,
        "name": "Проект А",
        "date": "01.10.2023",
        "status": "Активен",
        "customData": {},
        "attachments": {}
      },
      {
        "id": 2,
        "name": "Проект Б",
        "date": "05.10.2023",
        "status": "Завершен",
        "customData": {},
        "attachments": {}
      },
      {
        "id": 3,
        "name": "Проект В",
        "date": "10.10.2023",
        "status": "В процессе",
        "customData": {},
        "attachments": {}
      }
    ],
    "users": [
      {
        "username": "admin",
        "password": "admin",
        "role": "admin"
      },
      {
        "username": "user",
        "password": "user",
        "role": "user"
      }
    ],
    "customButtons": [],
    "customColumns": [],
    "basicColumns": [
      {
        "id": "id",
        "name": "№ п/п",
        "editable": false
      },
      {
        "id": "name",
        "name": "Название",
        "editable": true
      },
      {
        "id": "date",
        "name": "Дата создания",
        "editable": true
      },
      {
        "id": "status",
        "name": "Статус",
        "editable": true
      }
    ],
    "dateValidationColumns": {},
    "tabs": [
      {
        "id": "tab1",
        "name": "Основное окно",
        "data": null
      }
    ]
  },
  "features": {
    "authentication": true,
    "roleBasedAccess": true,
    "githubSync": true,
    "excelImportExport": true,
    "dateValidation": true,
    "fileAttachments": true,
    "customColumns": true,
    "multipleTabs": true,
    "realTimeCollaboration": true
  },
  "supportedFileTypes": [
    "image/*",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".txt"
  ],
  "dateFormats": [
    "dd.mm.yyyy"
  ],
  "themes": [
    "theme-orange"
  ]
}
