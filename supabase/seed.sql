-- Client Desk: SAMPLE DATA ONLY
-- Fictional clients and numbers that mirror the approved designs.
-- Remove everything with supabase/reset_sample_data.sql before importing real data.

-- Real exchange rates are loaded by private.sync_fx() (see the fx_sync migration).
select private.sync_fx((current_date - 460)::date);

do $$
declare
  c_nord uuid; c_brisk uuid; c_vela uuid; c_oak uuid; c_pine uuid; c_kant uuid; c_mari uuid;
  e_nord uuid; e_brisk uuid; e_vela uuid; e_oak uuid; e_pine uuid; e_kant uuid; e_mari uuid;
  t_id uuid;
  inv_no int := 300;
  m date;
  wk date;
  i int;
  h numeric;
  amt numeric;
  inr numeric;
  eur_per_usd numeric;
  inr_per_usd numeric;
  kant_hours numeric[] := array[8,9,8,9,8,8,9,8,9,8,9,8,9,8,8,9,8,9,8,9,8,9,8,8,9,8,9,8,9,8,9,8,9,8,8,9,8,9,8,9,9,8,9,8,9,8,7,9,6,5,5,5];
  p_id uuid;
  net_sum numeric;
  chg_sum numeric;
  today date := current_date;
begin
  -- Clients -------------------------------------------------------------
  insert into clients (name, legal_name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note)
  values ('Nordlicht Digital GmbH', 'Nordlicht Digital GmbH', 'Germany', 'EUR', 30, today - 540, 14, 'Fortnightly sync with Jonas')
  returning id into c_nord;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note)
  values ('Studio Brisk', 'Netherlands', 'EUR', 14, date_trunc('month', today - 200)::date, 14, 'Fortnightly check-in with Femke')
  returning id into c_brisk;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note)
  values ('Vela Commerce', 'Denmark', 'EUR', 9, today - 410, 14, 'Fortnightly review with Mads')
  returning id into c_vela;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note)
  values ('Oakline Supply Co.', 'United States', 'USD', 15, today - 130, 14, 'Fortnightly build review')
  returning id into c_oak;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note, upwork_name)
  values ('Hollow Pine Co.', 'United States', 'USD', 0, today - 600, 14, 'Fortnightly check-in with Dana', 'Hollow Pine Co.')
  returning id into c_pine;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note, upwork_name)
  values ('Kanteen Labs', 'United Kingdom', 'USD', 0, today - 590, 14, 'Fortnightly check-in with Priya', 'Kanteen Labs')
  returning id into c_kant;
  insert into clients (name, country, billing_currency, payment_terms_days, client_since, cadence_days, cadence_note, upwork_name)
  values ('Marigold & Moss', 'Canada', 'USD', 0, today - 175, 14, 'Milestone reviews with Ines', 'Marigold & Moss')
  returning id into c_mari;

  insert into brands (client_id, name) values
    (c_nord, 'Fjell Outdoor'), (c_nord, 'Kaffee Kollektiv'), (c_nord, 'Hausgold'), (c_nord, 'Brisa Home'),
    (c_brisk, 'Tulpen & Co'), (c_brisk, 'Noorderlicht Wear'),
    (c_vela, 'Vela Swim'),
    (c_oak, 'Oakline Supply'),
    (c_pine, 'Hollow Pine'), (c_pine, 'Pine & Ember'), (c_pine, 'Cabin Goods'),
    (c_kant, 'Kanteen Coffee'),
    (c_mari, 'Marigold & Moss'), (c_mari, 'Moss Botanicals');

  insert into contacts (client_id, name, role, is_primary) values
    (c_nord, 'Jonas Weber', 'Partner', true),
    (c_brisk, 'Femke de Vries', 'Studio lead', true),
    (c_vela, 'Mads Holm', 'Ecommerce manager', true),
    (c_oak, 'Rachel Kim', 'Head of Digital', true),
    (c_pine, 'Dana Brooks', 'Founder', true),
    (c_kant, 'Priya Raman', 'Head of Ecommerce', true),
    (c_kant, 'Tom Ellery', 'Developer', false),
    (c_mari, 'Ines Moreau', 'Operations', true);

  -- Engagements ---------------------------------------------------------
  insert into engagements (client_id, title, type, channel, currency, monthly_value, start_date)
  values (c_nord, 'White-label retainer', 'retainer', 'direct', 'EUR', 1900, today - 540) returning id into e_nord;
  insert into engagements (client_id, title, type, channel, currency, monthly_value, start_date)
  values (c_brisk, 'Monthly retainer', 'retainer', 'direct', 'EUR', 1750, date_trunc('month', today - 200)::date) returning id into e_brisk;
  insert into engagements (client_id, title, type, channel, currency, hourly_rate, start_date)
  values (c_vela, 'CRO and theme work', 'hourly', 'direct', 'EUR', 55, today - 410) returning id into e_vela;
  insert into engagements (client_id, title, type, channel, currency, total_value, start_date, end_date)
  values (c_oak, 'Storefront rebuild', 'fixed', 'direct', 'USD', 9600, today - 130, today + 40) returning id into e_oak;
  insert into engagements (client_id, title, type, channel, currency, hourly_rate, start_date)
  values (c_pine, 'Ongoing Shopify development', 'hourly', 'upwork', 'USD', 45, today - 600) returning id into e_pine;
  insert into engagements (client_id, title, type, channel, currency, hourly_rate, start_date)
  values (c_kant, 'PDP and checkout work', 'hourly', 'upwork', 'USD', 45, today - 590) returning id into e_kant;
  insert into engagements (client_id, title, type, channel, currency, total_value, start_date)
  values (c_mari, 'Store build in milestones', 'fixed', 'upwork', 'USD', 13000, today - 175) returning id into e_mari;

  -- Direct invoices -----------------------------------------------------
  for i in 0..11 loop
    m := (date_trunc('month', today) - make_interval(months => 11 - i))::date;

    -- Nordlicht retainer, 1st of month, net 30
    if m >= today - 540 then
      inv_no := inv_no + 1;
      select per_usd into inr_per_usd from fx_rates where currency = 'INR' and day <= m + 17 order by day desc limit 1;
      select per_usd into eur_per_usd from fx_rates where currency = 'EUR' and day <= m + 17 order by day desc limit 1;
      if m < date_trunc('month', today)::date then
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status, paid_on, amount_received_inr)
        values (c_nord, e_nord, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', 1900, m, m + 29, 'paid', m + 17,
                round(1900 / eur_per_usd * inr_per_usd * 0.994, 2));
      else
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status)
        values (c_nord, e_nord, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', 1900, m, m + 30, 'sent');
      end if;
    end if;

    -- Studio Brisk retainer, from their start month, net 14
    if m >= date_trunc('month', today - 200)::date then
      inv_no := inv_no + 1;
      select per_usd into inr_per_usd from fx_rates where currency = 'INR' and day <= m + 8 order by day desc limit 1;
      select per_usd into eur_per_usd from fx_rates where currency = 'EUR' and day <= m + 8 order by day desc limit 1;
      if m < date_trunc('month', today)::date then
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status, paid_on, amount_received_inr)
        values (c_brisk, e_brisk, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', 1750, m, m + 14, 'paid', m + 8,
                round(1750 / eur_per_usd * inr_per_usd * 0.994, 2));
      else
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status)
        values (c_brisk, e_brisk, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', 1750, m, m + 14, 'sent');
      end if;
    end if;

    -- Vela hourly, billed monthly, net 9; last month's invoice is stuck
    if m < date_trunc('month', today)::date then
      inv_no := inv_no + 1;
      amt := 55 * (16 + (i % 5) * 2);
      if m = (date_trunc('month', today) - interval '1 month')::date then
        amt := 900;
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status)
        values (c_vela, e_vela, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', amt, m, m + 9, 'sent');
      else
        select per_usd into inr_per_usd from fx_rates where currency = 'INR' and day <= m + 12 order by day desc limit 1;
        select per_usd into eur_per_usd from fx_rates where currency = 'EUR' and day <= m + 12 order by day desc limit 1;
        insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status, paid_on, amount_received_inr)
        values (c_vela, e_vela, 'INV-' || lpad(inv_no::text, 4, '0'), 'EUR', amt, m, m + 9, 'paid', m + 12,
                round(amt / eur_per_usd * inr_per_usd * 0.994, 2));
      end if;
    end if;
  end loop;

  -- Oakline fixed project: 3 milestones of $3,200, the third still to bill
  for i in 0..1 loop
    inv_no := inv_no + 1;
    m := today - 110 + i * 55;
    select per_usd into inr_per_usd from fx_rates where currency = 'INR' and day <= m + 12 order by day desc limit 1;
    insert into invoices (client_id, engagement_id, number, currency, amount, issued_on, due_on, status, paid_on, amount_received_inr)
    values (c_oak, e_oak, 'INV-' || lpad(inv_no::text, 4, '0'), 'USD', 3200, m, m + 15, 'paid', m + 12,
            round(3200 * inr_per_usd * 0.996, 2));
  end loop;

  -- Upwork earnings: weekly hourly for 52 weeks -------------------------
  for i in 0..51 loop
    wk := (date_trunc('week', today) - make_interval(weeks => 52 - i))::date;  -- Monday
    -- Kanteen
    h := kant_hours[i + 1];
    insert into upwork_earnings (client_id, engagement_id, kind, period_start, period_end, hours, gross_usd, fee_usd, status, description)
    values (c_kant, e_kant, 'hourly', wk, wk + 6, h, h * 45, round(h * 45 * 0.10, 2),
            case when wk + 6 >= today - 10 then 'pending' else 'withdrawn' end, 'Hourly, week of ' || to_char(wk, 'DD Mon'));
    -- Hollow Pine
    h := 13 + (i % 4);
    insert into upwork_earnings (client_id, engagement_id, kind, period_start, period_end, hours, gross_usd, fee_usd, status, description)
    values (c_pine, e_pine, 'hourly', wk, wk + 6, h, h * 45, round(h * 45 * 0.10, 2),
            case when wk + 6 >= today - 10 then 'pending' else 'withdrawn' end, 'Hourly, week of ' || to_char(wk, 'DD Mon'));
  end loop;

  -- Marigold milestones, roughly monthly since they started
  for i in 0..5 loop
    m := today - 160 + i * 28;
    insert into upwork_earnings (client_id, engagement_id, kind, period_end, gross_usd, fee_usd, status, description)
    values (c_mari, e_mari, 'milestone', m, 2143.78, 214.38,
            case when m >= today - 10 then 'pending' else 'withdrawn' end, 'Milestone ' || (i + 1));
  end loop;

  -- Upwork account charges and monthly payouts --------------------------
  for i in 0..11 loop
    m := (date_trunc('month', today) - make_interval(months => 12 - i))::date;  -- previous 12 full months
    insert into upwork_charges (occurred_on, kind, amount_usd, description) values
      (m + 4, 'membership', 20, 'Membership'),
      (m + 11, 'connects', case when i % 3 = 0 then 164 else 48 end, 'Connects'),
      ((m + interval '1 month' - interval '1 day')::date, 'withdrawal_fee', 2, 'Withdrawal fee');

    select coalesce(sum(net_usd), 0) into net_sum from upwork_earnings
      where period_end >= m and period_end < (m + interval '1 month')::date and status = 'withdrawn';
    select coalesce(sum(amount_usd), 0) into chg_sum from upwork_charges
      where occurred_on >= m and occurred_on < (m + interval '1 month')::date;
    select per_usd into inr_per_usd from fx_rates where currency = 'INR'
      and day <= (m + interval '1 month' - interval '1 day')::date order by day desc limit 1;

    insert into payouts (paid_on, usd_withdrawn, inr_received, note)
    values ((m + interval '1 month' - interval '1 day')::date,
            -- one sample month is deliberately off by $12.40 to show the reconciliation check
            net_sum - chg_sum - case when i = 9 then 12.40 else 0 end,
            round((net_sum - chg_sum - case when i = 9 then 12.40 else 0 end) * inr_per_usd, 2),
            'Monthly withdrawal')
    returning id into p_id;

    update upwork_earnings set payout_id = p_id
      where period_end >= m and period_end < (m + interval '1 month')::date and status = 'withdrawn';
    update upwork_charges set payout_id = p_id
      where occurred_on >= m and occurred_on < (m + interval '1 month')::date;
  end loop;

  -- This month's charges so far (not yet withdrawn)
  insert into upwork_charges (occurred_on, kind, amount_usd, description) values
    (date_trunc('month', today)::date + 4, 'membership', 20, 'Membership'),
    (date_trunc('month', today)::date + 11, 'connects', 48, 'Connects');
  update upwork_earnings set status = 'available'
    where payout_id is null and status = 'withdrawn';

  -- Touchpoints, action items, ratings, notes ---------------------------
  -- Kanteen: on time, with two open action items
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_kant, today - 25, 'call', 'good', 'PDP launch review. Priya asked whether subscriptions could land in Q1.')
  returning id into t_id;
  insert into action_items (client_id, touchpoint_id, text, due_on) values (c_kant, t_id, 'Send a rough estimate for subscriptions', today + 14);
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_kant, today - 11, 'call', 'neutral', 'Fortnightly check-in. Their Q4 roadmap is paused until the January budget lands, so expect lighter weeks.')
  returning id into t_id;
  insert into action_items (client_id, touchpoint_id, text, due_on) values (c_kant, t_id, 'Send the checkout audit proposal', today + 3);
  insert into health_ratings (client_id, rating, reason, created_at) values (c_kant, 'green', 'Happy with the PDP work.', today - 13);
  insert into notes (client_id, body, created_at) values (c_kant, 'Tom prefers async updates in Slack over calls.', today - 40);

  -- Hollow Pine: healthy, one overdue action item
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_pine, today - 16, 'call', 'good', 'Black Friday planning. Dana wants a QA plan for the sale theme.')
  returning id into t_id;
  insert into action_items (client_id, touchpoint_id, text, due_on) values (c_pine, t_id, 'Send the Black Friday QA plan', today - 2);
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_pine, today - 4, 'async', 'good', 'Shared staging link for the new collection pages.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_pine, 'green', 'Steady and easy to work with.', today - 9);

  -- Nordlicht: healthy
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary) values
    (c_nord, today - 20, 'call', 'good', 'Q4 capacity planning for their four brands.'),
    (c_nord, today - 6, 'call', 'good', 'Sprint review. Two new CRO tests approved.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_nord, 'green', 'Reliable partner, expanding scope.', today - 20);

  -- Studio Brisk: contact gone quiet
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_brisk, today - 35, 'call', 'neutral', 'Monthly review. Femke mentioned budget pressure for next quarter.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_brisk, 'green', 'Good start to the retainer.', today - 28);

  -- Vela: one stuck invoice
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_vela, today - 9, 'call', 'neutral', 'Mads says the invoice is with their finance team.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_vela, 'amber', 'Payment is slow.', today - 9);

  -- Oakline: rating going stale
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_oak, today - 3, 'meeting', 'good', 'Milestone 3 scope walk-through.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_oak, 'green', 'Smooth project so far.', today - 34);

  -- Marigold
  insert into touchpoints (client_id, occurred_on, type, sentiment, summary)
  values (c_mari, today - 2, 'call', 'good', 'Milestone review. Ines approved the PDP layout.');
  insert into health_ratings (client_id, rating, reason, created_at) values (c_mari, 'green', 'Clear feedback, quick approvals.', today - 2);
end $$;
