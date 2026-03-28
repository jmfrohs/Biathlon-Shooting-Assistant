/*
MIT License

Copyright (c) 2026 jmfrohs
*/

/**
 * Format DB row to frontend-compatible Athlete JSON
 */
function formatAthlete(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    age: row.age,
    ageGroup: row.age_group,
    squad: row.squad,
    gender: row.gender,
    proneStart: row.prone_start,
    standingStart: row.standing_start,
    clickValue: row.click_value,
    useDefaultTimes: !!row.use_default_times,
    proneTimeAdd: row.prone_time_add,
    standingTimeAdd: row.standing_time_add,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Format DB session row + related data to frontend-compatible JSON
 */
function formatSession(session, series, athleteIds, athleteData) {
  if (!session) return null;
  let weather = {};
  if (typeof session.weather_json === 'string') {
    try {
      weather = JSON.parse(session.weather_json || '{}');
    } catch (e) {
      weather = {};
    }
  } else if (session.weather_json) {
    weather = session.weather_json;
  }

  return {
    id: session.id,
    name: session.name,
    location: session.location,
    type: session.type,
    date: session.date,
    time: session.time,
    competitionCategory: session.competition_category,
    competitionType: session.competition_type,
    weather,
    athletes: athleteIds || [],
    athleteData: athleteData || [],
    series: series || [],
    shareCode: session.share_code,
    shareExpiresAt: session.share_expires_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

module.exports = { formatAthlete, formatSession };
