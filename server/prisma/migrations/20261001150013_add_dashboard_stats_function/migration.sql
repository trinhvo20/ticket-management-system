-- Computes the dashboard stats (total/open/AI-resolved counts, AI-resolved %, average
-- resolution time, and a zero-filled daily ticket count for the trailing p_days days)
-- in a single round trip, instead of multiple queries plus application-side aggregation.
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_ai_agent_id text, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total integer;
  v_open integer;
  v_resolved_by_ai integer;
  v_avg_resolution_ms double precision;
  v_pct_resolved_by_ai double precision;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_since date := (now() AT TIME ZONE 'UTC')::date - (p_days - 1);
  v_daily_counts jsonb;
BEGIN
  SELECT count(*) INTO v_total FROM "ticket";

  SELECT count(*) INTO v_open FROM "ticket" WHERE "status" = 'open';

  SELECT count(*) INTO v_resolved_by_ai
    FROM "ticket"
    WHERE "status" = 'resolved' AND "assignedToId" = p_ai_agent_id;

  SELECT avg(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) * 1000)
    INTO v_avg_resolution_ms
    FROM "ticket"
    WHERE "resolvedAt" IS NOT NULL;

  v_pct_resolved_by_ai := CASE WHEN v_total > 0 THEN (v_resolved_by_ai::double precision / v_total) * 100 ELSE 0 END;

  SELECT jsonb_agg(
    jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'count', coalesce(c.cnt, 0))
    ORDER BY d.day
  )
    INTO v_daily_counts
    FROM (
      SELECT generate_series(v_since::timestamp, v_today::timestamp, interval '1 day')::date AS day
    ) d
    LEFT JOIN (
      SELECT "createdAt"::date AS day, count(*) AS cnt
      FROM "ticket"
      WHERE "createdAt" >= v_since
      GROUP BY 1
    ) c ON c.day = d.day;

  RETURN jsonb_build_object(
    'total', v_total,
    'open', v_open,
    'resolvedByAi', v_resolved_by_ai,
    'pctResolvedByAi', v_pct_resolved_by_ai,
    'avgResolutionTimeMs', v_avg_resolution_ms,
    'dailyCounts', coalesce(v_daily_counts, '[]'::jsonb)
  );
END;
$$;
