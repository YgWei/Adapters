'use strict'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
const env = process.env.NODE_ENV || 'development'

const rootDir = path.resolve(__dirname, '../..')

const csProtocol = process.env.CS_PROTOCOL || 'http'
const csHost = process.env.CS_HOST || 'localhost'
const csPort = process.env.CS_PORT || 5000
const csCollection = process.env.CS_COLLECTION || 'jk'

const configs = {
  base: {
    host: process.env.APP_HOST || 'localhost',
    port: process.env.APP_PORT || 8080,
    root: rootDir,
    logger: {
      fileName: process.env.LOG_FILENAME || 'RenderAdapter',
      directory: process.env.LOG_DIRECTORY || 'logs',
      level: process.env.LOG_LEVEL || 'info'
    },
    folder: {
      downloadFolder: process.env.DOWNLOAD_FOLDER || 'downloads'
    },
    orc: {
      protocol: process.env.ORC_PROTOCOL || 'http',
      host: process.env.ORC_HOST || 'localhost',
      port: process.env.ORC_PORT || '80',
      renderEngineUrl: process.env.RENDER_ENGINE_URL || 'http://jkdjk-template-headless.jkdjk:3000/jk'
    },
    ftp: {
      path: process.env.JK_FTP_PATH || '/ssmo/jk',
      host: process.env.JK_FTP_HOST || '192.168.200.24',
      port: process.env.JK_FTP_PORT || 21,
      user: process.env.JK_FTP_USER || 'test',
      password: process.env.JK_FTP_PASSWORD || 'belstar123'
    },
    cloudStorage: {
      host: csHost,
      port: csPort,
      protocol: csProtocol,
      collection: csCollection,
      timeout: process.env.CS_TIMEOUT || 5000
    },
    cloudStorageSetting: {
      collection: csCollection,
      uploadUrl: `${csProtocol}://${csHost}:${csPort}/api/${csCollection}/upload`,
      expireUrl: `${csProtocol}://${csHost}:${csPort}/api/${csCollection}/fileExpire`
    },
    retryTimes: process.env.RETRY_TIMES || 2,
    retryDelay: process.env.RETRY_DELAY || 1000
  },
  production: {
  },
  development: {
  },
  test: {
  }
}
const config = Object.assign(configs.base, configs[env])

export default config
