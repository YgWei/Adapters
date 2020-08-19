'use strict'

import { Router } from 'express'
import * as yg from '../controllers/ygRender'
import swaggerSpec from '../util/swagger'
import validator from '../middlewares/validator'
import { ygRequestBodyValidate } from '../schema/ygRender'

const router = Router()

/**
* Expose swagger.json at /api/swagger.json
*/
router.get('/swagger.json', function (req, res) {
  res.json(swaggerSpec)
})

router.post('/yg/custom/ftp', validator(ygRequestBodyValidate), yg.fromFtp)


export default router
