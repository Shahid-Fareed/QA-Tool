const express = require("express");
const router = express.Router();
const dbConnect = require("../db");
const { requireAuth } = require("../middleware/auth");
const { hasPermission } = require("../rbac");
const BugReport = require("../models/BugReport");

// Bug routes can be added here in the future if needed
// The previous Jira export route has been removed as per user request.

module.exports = router;
