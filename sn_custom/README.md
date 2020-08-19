# Render Adapter

## 映射目錄

- logs: /home/node/app/logs。存放 log 的目錄

## Swagger API

- `${APP_PROTOCOL}://${APP_HOST}:${APP_PORT}/api-docs/index.html` . Default is http://localhost:8080/api-docs/index.html

1. Install dependency

```
  npm install
```

2. Add enviroment file. File name is .env

```
APP_NAME= Name of the App. Default is SN_CUSTOM
APP_PORT= Port for this App. Default is 8080
APP_HOST= Host for the App. Default is localhost

# Log
LOG_FILENAME= Log's save directory. Default is logs
LOG_DIRECTORY= Log's base file name. Default is SN_CUSTOM
LOG_LEVEL= Log's level. Default is info

# cloud storage
CS_PROTOCOL= cloud storage's internet protocol. default is http
CS_HOST= cloud storage's host. default is 0.0.0.0
CS_PORT= cloud storage's port. default is 5000
CS_COLLECTION= cloud storage's collection. default is sn
UPLOAD_EXPIRE_TIME= cloud storage's upload file expire time in hours. Default is 720 hours
TIMEOUT= cloud storage's connect timeout. Default is 5000
RETRY_TIMES= cloud storage's retry limit. Default is 2
RETRY_DELAY= cloud storage's retry delay. Default is 1000

# Orchestrator
ORC_PROTOCOL= orc's internet protocol. Default is http
ORC_HOST= orc's Host. Default is mtm.belstar.com.cn
ORC_PORT= orc's Port. Default is 8080

# Folders
DOWNLOAD_FOLDER=storage folder that we write and save .json file into for later upload. Default is downloads
```

3. Run the app

```
# Run with development mode
  - npm run dev

#Compiles and minifies for production
  - npm run build
  - npm run start
```
