'use strict';

/**
 * Filter an activity object to only include fields allowed for summary view.
 * @param {Object} activity - The full activity object from database
 * @returns {Object} A new object with only allowed fields
 */
function toSummaryView(activity) {
  if (!activity) return activity;
  
  const taskCount = Number(activity.task_count) || 0;
  const doneCount = Number(activity.done_count) || 0;
  const progressPercent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  
  return {
    id: activity.id,
    title: activity.title,
    status: activity.status,
    priority: activity.priority,
    start_date: activity.start_date,
    deadline: activity.deadline,
    progress_percent: progressPercent,
    event_lead_name: activity.event_lead_name,
    directive_id: activity.directive_id
  };
}

module.exports = {
  toSummaryView
};
