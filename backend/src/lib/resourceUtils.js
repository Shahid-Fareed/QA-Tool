const mongoose = require("mongoose");
const dbConnect = require("../db");

const PRIORITY_MAP = {
  high: ["High", "Critical", "Major", "Blocker"],
  medium: ["Medium", "Moderate"],
  low: ["Low", "Minor"],
};

/**
 * Fetch paginated resources with module overview or item list mode.
 * @param {object} params
 * @param {any} params.model - Mongoose model
 * @param {string} params.projectId
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.activeModule]
 * @param {string} [params.activePriority]
 */
async function fetchPaginatedResource({
  model,
  projectId,
  page,
  limit,
  activeModule,
  activePriority,
  activeStatus,
}) {
  await dbConnect();
  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const isOverview = !activeModule && !activePriority && !activeStatus;
  const effectiveLimit = isOverview ? 10 : limit;
  const skip = (page - 1) * effectiveLimit;

  let data = [];
  let totalPages = 0;

  if (isOverview) {
    const moduleAggregation = await model.aggregate([
      { $match: { projectId: projectObjectId } },
      {
        $group: {
          _id: "$moduleId",
          totalItems: { $sum: 1 },
          firstCreated: { $min: "$createdAt" }, // earliest doc in this module
        },
      },
      { $sort: { firstCreated: 1 } }, // oldest module first → newest module last
    ]);

    totalPages = Math.max(
      1,
      Math.ceil(moduleAggregation.length / effectiveLimit),
    );
    const paginatedItems = moduleAggregation.slice(skip, skip + effectiveLimit);

    data = paginatedItems.map((item) => ({
      _id: item._id,
      moduleId: item._id,
      title: item._id,
      totalItems: item.totalItems,
      isModuleOverview: true,
    }));
  } else {
    const query = { projectId: projectObjectId };
    if (activeModule) query.moduleId = activeModule;
    if (activeStatus) query.status = activeStatus;

    if (activePriority && PRIORITY_MAP[activePriority.toLowerCase()]) {
      query.priority = { $in: PRIORITY_MAP[activePriority.toLowerCase()] };
    } else if (activePriority === "vision") {
      query.isVision = true;
    } else if (activePriority === "manual") {
      query.isManual = true;
    }

    const totalCount = await model.countDocuments(query);
    totalPages = Math.max(1, Math.ceil(totalCount / effectiveLimit));
    data = await model
      .find(query)
      .sort({ customId: 1 })
      .skip(skip)
      .limit(effectiveLimit)
      .lean();
  }

  // Stats aggregation
  const statsAggregation = await model.aggregate([
    {
      $match: {
        projectId: projectObjectId,
        ...(activeModule ? { moduleId: activeModule } : {}),
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        high: {
          $sum: { $cond: [{ $in: ["$priority", PRIORITY_MAP.high] }, 1, 0] },
        },
        medium: {
          $sum: { $cond: [{ $in: ["$priority", PRIORITY_MAP.medium] }, 1, 0] },
        },
        low: {
          $sum: { $cond: [{ $in: ["$priority", PRIORITY_MAP.low] }, 1, 0] },
        },
        vision: { $sum: { $cond: [{ $eq: ["$isVision", true] }, 1, 0] } },
        manual: { $sum: { $cond: [{ $eq: ["$isManual", true] }, 1, 0] } },
        passed: {
          $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "passed"] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "failed"] }, 1, 0] },
        },
        pending: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$status" }, "pending"] }, 1, 0],
          },
        },
        closed: {
          $sum: { $cond: [{ $eq: [{ $toLower: "$status" }, "closed"] }, 1, 0] },
        },
        backlog: {
          $sum: {
            $cond: [{ $eq: [{ $toLower: "$status" }, "backlog"] }, 1, 0],
          },
        },
        inProgress: {
          $sum: {
            $cond: [
              {
                $in: [
                  { $toLower: "$status" },
                  ["in progress", "in-progress", "progress"],
                ],
              },
              1,
              0,
            ],
          },
        },
        inReview: {
          $sum: {
            $cond: [
              {
                $in: [
                  { $toLower: "$status" },
                  ["in review", "in-review", "review"],
                ],
              },
              1,
              0,
            ],
          },
        },
        done: {
          $sum: {
            $cond: [
              { $in: [{ $toLower: "$status" }, ["done", "resolved"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const serverStats = statsAggregation[0] || {
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    vision: 0,
    manual: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    closed: 0,
    backlog: 0,
    inProgress: 0,
    inReview: 0,
    done: 0,
  };

  return { data: JSON.parse(JSON.stringify(data)), totalPages, serverStats };
}

module.exports = { fetchPaginatedResource, PRIORITY_MAP };
