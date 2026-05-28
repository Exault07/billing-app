// Utility to log audit trail entries to Supabase
import { supabase } from '../supabaseClient';

export async function logAudit({ tableName, recordId, changedBy, changeType, oldData, newData }) {
  try {
    await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      changed_by: changedBy,
      change_type: changeType,
      old_data: oldData || null,
      new_data: newData || null,
    });
  } catch (err) {
    // Audit logging should never break the main flow
    
  }
}

// Compute a human-readable diff between two objects
export function computeDiff(oldData, newData) {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const diffs = [];
  keys.forEach(key => {
    const oldVal = JSON.stringify(oldData[key]);
    const newVal = JSON.stringify(newData[key]);
    if (oldVal !== newVal) {
      diffs.push({ field: key, from: oldData[key], to: newData[key] });
    }
  });
  return diffs;
}
