'use strict'

import { Router } from 'express'
import * as jk from '../controllers/jkRender'
import swaggerSpec from '../util/swagger'
import validator from '../middlewares/validator'
import { jkFTPPostBodyValidate } from '../schema/jkRender'

const router = Router()

/**
* Expose swagger.json at /api/swagger.json
*/
router.get('/swagger.json', function (req, res) {
  res.json(swaggerSpec)
})

router.post('/jkdjk/ftp', validator(jkFTPPostBodyValidate), jk.startFromFTP)

export default router
