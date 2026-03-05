-- Inspect the status of the requests
SELECT id, status, status_code, response_body, created_at
FROM net.http_request_queue
ORDER BY id DESC
LIMIT 5;
