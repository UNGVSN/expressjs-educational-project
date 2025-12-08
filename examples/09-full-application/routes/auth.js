/**
 * Authentication Routes
 */

const express = require('express')
const router = express.Router()

const authService = require('../services/authService')
const { authenticate } = require('../middleware/auth')
const { validate, schemas } = require('../middleware/validate')
const { asyncHandler, formatResponse } = require('../utils/helpers')

// POST /auth/register
router.post('/register',
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body)

    res.status(201).json(formatResponse(result, 'Registration successful'))
  })
)

// POST /auth/login
router.post('/login',
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body)

    res.json(formatResponse(result, 'Login successful'))
  })
)

// POST /auth/refresh
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token required', status: 400 }
      })
    }

    const result = authService.refresh(refreshToken)

    res.json(formatResponse(result, 'Token refreshed'))
  })
)

// POST /auth/logout
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body

    authService.logout(refreshToken)

    res.json(formatResponse(null, 'Logged out successfully'))
  })
)

// POST /auth/change-password
router.post('/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Current and new password required', status: 400 }
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'New password must be at least 6 characters', status: 400 }
      })
    }

    await authService.changePassword(req.user.id, currentPassword, newPassword)

    res.json(formatResponse(null, 'Password changed successfully'))
  })
)

module.exports = router
