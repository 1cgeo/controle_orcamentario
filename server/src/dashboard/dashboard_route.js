'use strict'

const express = require('express')

const { asyncHandler, httpCode, schemaValidation } = require('../utils')

const dashboardCtrl = require('./dashboard_ctrl')
const dashboardSchema = require('./dashboard_schema')

const router = express.Router()

module.exports = router
