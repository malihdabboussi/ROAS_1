UPDATE public.agents_registry
   SET name = 'Jaime'
 WHERE agent_key = 'hr'
   AND name IS DISTINCT FROM 'Jaime';
