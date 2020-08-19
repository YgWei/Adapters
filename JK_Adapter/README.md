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
APP_NAME= Name of the App. Default is jkdjk_qrh
APP_PORT= Port for this App. Default is 8080
APP_HOST= Host for the App. Default is localhost

# Log
LOG_FILENAME= Log's save directory. Default is logs
LOG_DIRECTORY= Log's base file name. Default is jkdjk_qrh
LOG_LEVEL= Log's level. Default is info

# cloud storage
CS_PROTOCOL= cloud storage's internet protocol. Default is http
CS_HOST= cloud storage's host. Default is 0.0.0.0
CS_PORT= cloud storage's port. Default is 5000
CS_COLLECTION= cloud storage's collection. Default is jk
TIMEOUT= cloud storage's connect timeout. Default is 5000
RETRY_TIMES= cloud storage's retry limit. Default is 2
RETRY_DELAY= cloud storage's retry delay. Default is 1000

# ftp
JK_FTP_PATH= ftp's directory path. Default is
JK_FTP_HOST= ftp's host. Default is
JK_FTP_PORT= ftp's port. Default is
JK_FTP_USER= ftp's account. Default is test
JK_FTP_PASSWORD= ftp's password. Default is

# Orchestrator
ORC_PROTOCOL= orc's internet protocol. Default is http
ORC_HOST= orc's Host. Default is mtm.belstar.com.cn
ORC_PORT= orc's Port. Default is 8080
RENDER_ENGINE_URL= render engine url that are sent on orc's request body. Default is http://jkdjk-template-headless.jkdjk:3000/jk

# Folders
DOWNLOAD_FOLDER= storage folder that we put downloaded files into. Default is downloads
```

3. Run the app

```
# Run with development mode
  - npm run dev

#Compiles and minifies for production
  - npm run build
  - npm run start
```
