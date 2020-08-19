'use strict'

import swaggerJSDoc from 'swagger-jsdoc'
import config from '../config/'

var options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'SN Custom API',
      description: 'SN Custom API for ExpressJS based services',
      version: '0.0.1'
    },
    servers: [
      {
        url: `http://${config.host}:${config.port}/{basePath}`,
        variables: {
          basePath: {
            default: 'api'
          }
        }
      },
      {
        url: `https://${config.host}:${config.port}/{basePath}`,
        variables: {
          basePath: {
            default: 'api'
          }
        }
      }
    ]
  },
  apis: ['src/controllers/*.js']
}

const swaggerSpec = swaggerJSDoc(options)

export default swaggerSpec
