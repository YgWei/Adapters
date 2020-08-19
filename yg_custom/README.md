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
APP_NAME= Name of the App. Default is YG_Custom
APP_PORT= Port for this App. Default is 8080
APP_HOST= Host for the App. Default is localhost

# Log
LOG_FILENAME= Log's save directory. Default is logs
LOG_DIRECTORY= Log's base file name. Default is YG_Custom
LOG_LEVEL= Log's level. Default is info

# ygAppserver
YG_APPSERVER_PROTOCAL= YG's internet protocol. Default is http
YG_APPSERVER_HOST= YG's Host. Default is mtm.belstar.com.cn
YG_APPSERVER_PORT= YG's Port. Default is 8080

# cloud storage
CS_PROTOCOL= cloud storage's internet protocol. Default is http
CS_HOST= cloud storage's host. Default is 0.0.0.0
CS_PORT= cloud storage's port. Default is 5000
CS_COLLECTION= cloud storage's collection. Default is yg
CS_TIMEOUT= cloud storage's connect timeout. Default is 5000
UPLOAD_EXPIRE_TIME= cloud storage's upload file expire time in hours. Default is 720 hours
RETRY_TIMES= cloud storage's retry limit. Default is 2
RETRY_DELAY= cloud storage's retry delay. Default is 1000

# ftp
YG_FTP_PATH= ftp's directory path. Default is /ssmo/yg
YG_FTP_HOST= ftp's host. Default is 192.168.20.63
YG_FTP_PORT= ftp's port. Default is 21
YG_FTP_USER= ftp's account. Default is test
YG_FTP_PASSWORD= ftp's password. Default is belstart123

# Orchestrator
ORC_PROTOCOL= orc's internet protocol. Default is http
ORC_HOST= orc's Host. Default is httpbin.org/post
ORC_PORT= orc's Port. Default is

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
