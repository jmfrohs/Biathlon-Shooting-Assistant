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
    country: row.country,
    federation: row.federation,
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
  let track = {};
  let notes = [];
  let parsedConditions = {};

  if (typeof session.weather_json === 'string') {
    try {
      parsedConditions = JSON.parse(session.weather_json || '{}');
    } catch (e) {
      parsedConditions = {};
    }
  } else if (session.weather_json) {
    parsedConditions = session.weather_json;
  }

  if (
    parsedConditions &&
    typeof parsedConditions === 'object' &&
    ('weather' in parsedConditions || 'track' in parsedConditions || 'notes' in parsedConditions)
  ) {
    weather =
      parsedConditions.weather && typeof parsedConditions.weather === 'object'
        ? parsedConditions.weather
        : {};
    track =
      parsedConditions.track && typeof parsedConditions.track === 'object'
        ? parsedConditions.track
        : {};
    notes = Array.isArray(parsedConditions.notes) ? parsedConditions.notes : [];
  } else {
    weather = parsedConditions && typeof parsedConditions === 'object' ? parsedConditions : {};
    track = {};
    notes = [];
  }

  const noteString = notes.map((n) => (typeof n === 'string' ? n : n.text)).join('\n\n') || null;

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
    track,
    notes,
    note: noteString,
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
