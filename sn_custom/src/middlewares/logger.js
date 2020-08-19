'use strict'
import logger from '../logger/request'

export default () => {
  return async (req, res, next) => {
    if (req.path.match(/swagger/)) {
      await next()
      return
    }
    logRequestObject(req, res)
    await next()
    // logResponseObject(req, res)
  }

  /**
   * Log request
   * @param {Context} ctx
   */
  function logRequestObject(req, res) {
    const requestObject = {
      message: 'Request event',
      method: req.method,
      path: req.path,
      url: req.url,
      headers: req.headers,
      protocol: req.protocol,
      ip: req.ip,
      query: req.query,
      body: req.body,
      requestID: res.get('X-Request-ID')
    }
    logger.info(requestObject)
  }
}

/**
 * Log response
 * @param {Context} ctx
 */
function logResponseObject(req, res) {
  const responseObject = {
    message: 'Response event',
    status: res.status,
    requestID: res.get('X-Request-ID'),
    headers: (res.response || {}).headers,
    type: res.type
  }
  // Only log json body
  if (res.get('Content-Type').includes('application/json')) {
    responseObject.body = res.body
  }
  logger.info(responseObject)
}
