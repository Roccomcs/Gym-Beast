-- JSON keys repeat heavily in small set/session snapshots. MAIN compresses
-- inline first; PostgreSQL still externalizes very large photos as a last resort.
-- Applies to new/re-written tuples only. Existing projects must measure again
-- and plan their rewrite/reclamation in a maintenance window (see operations).
alter table public.training_items alter column data set storage main;
alter table public.training_items set (toast_tuple_target=128);
