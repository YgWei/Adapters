'use strict'

import { Router } from 'express'
import * as sn from '../controllers/snRender'
import swaggerSpec from '../util/swagger'
import validator from '../middlewares/validator'
import { snRequestBodyValidate } from '../schema/snRender'

const router = Router()

/**
* Expose swagger.json at /api/swagger.json
*/
router.get('/swagger.json', function (req, res) {
  res.json(swaggerSpec)
})

router.post('/sn/custom', validator(snRequestBodyValidate), sn.preprocessSN)


export default router
