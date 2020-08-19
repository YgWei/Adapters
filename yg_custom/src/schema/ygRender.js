import Joi from '@hapi/joi'

export const ygRequestBodyValidate = {
  body: Joi.object({
    company: Joi.string().required(),
    batch: Joi.array().min(1).items(
      Joi.object({
        barcode: Joi.string().required(),
        workcenterCode: Joi.string().required()
      })
    )
  })
}
