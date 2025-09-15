<?php
header("Content-Type: application/json; charset=UTF-8");

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
    sendResultInfoAsJson('{"results":[' . $searchResults . '],"error":""}');
}

$inData = getRequestInfo();

$userId = isset($inData["userID"]) ? intval($inData["userID"]) : 0;

$rawSearch = isset($inData["search"]) ? trim($inData["search"]) : "";
$search = '%' . $rawSearch . '%';

if ($userId < 1) {
    returnWithError("Missing or invalid userID");
}

$conn = new mysqli("localhost", "Jackson_Cammack", "COP4331-Team10A", "COP4331");

if ($conn->connect_error) {
    returnWithError($conn->connect_error);
    exit;
}

$conn->set_charset("utf8mb4");

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