<?php
header("Content-Type: application/json; charset=UTF-8");

/* ---------- Helpers (classic template style) ---------- */
function getRequestInfo()
{
    $in = json_decode(file_get_contents('php://input'), true);
    return is_array($in) ? $in : [];
}

function sendResultInfoAsJson($obj)
{
    echo $obj;
    exit;
}

function returnWithError($err)
{
    sendResultInfoAsJson('{"results":[],"error":"' . $err . '"}');
}

function returnWithInfo($searchResults)
{
    // $searchResults should be a comma-joined string of per-row JSON objects
    sendResultInfoAsJson('{"results":[' . $searchResults . '],"error":""}');
}

/* ---------- Read input ---------- */
$inData = getRequestInfo();

// Match the frontend JSON keys exactly (userID is lowercase-d)
$userId = isset($inData["userID"]) ? intval($inData["userID"]) : 0;

// Build a LIKE pattern that supports partial search; empty becomes '%%'
$rawSearch = isset($inData["search"]) ? trim($inData["search"]) : "";
$search = '%' . $rawSearch . '%';

if ($userId < 1) {
    returnWithError("Missing or invalid userID");
}

/* ---------- DB connect ---------- */
/*
 * IMPORTANT: swap this line to the SAME connection you use in AddContact.php
 * Example:
 *   $conn = new mysqli("localhost", "YOUR_DB_USER", "YOUR_DB_PASS", "YOUR_DB_NAME");
 */
$conn = new mysqli("localhost", "Jackson_Cammack", "COP4331-Team10A", "COP4331");

if ($conn->connect_error) {
    returnWithError($conn->connect_error);
    exit;
}

// Ensure UTF-8
$conn->set_charset("utf8mb4");

/* ---------- Query ---------- */
$sql = "
    SELECT ID, FirstName, LastName, Email, Phone
    FROM Contacts
    WHERE UserID = ?
      AND (FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ? OR Phone LIKE ?)
    ORDER BY ID DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    returnWithError("SQL prepare failed");
}

$stmt->bind_param("issss", $userId, $search, $search, $search, $search);
if (!$stmt->execute()) {
    returnWithError("SQL execute failed");
}

$result = $stmt->get_result();
if ($result && $result->num_rows > 0) {
    $searchResults = "";
    while ($row = $result->fetch_assoc()) {
        if ($searchResults !== "") $searchResults .= ",";
        // Build each row as expected by the classic template
        $searchResults .=
            '{"id":"' . intval($row["ID"]) .
            '","firstName":"' . ($row["FirstName"] ?? "") .
            '","lastName":"'  . ($row["LastName"]  ?? "") .
            '","email":"'     . ($row["Email"]     ?? "") .
            '","phone":"'     . ($row["Phone"]     ?? "") .
            '"}';
    }
    returnWithInfo($searchResults);
} else {
    returnWithError("No Contacts Found");
}

$stmt->close();
$conn->close();
