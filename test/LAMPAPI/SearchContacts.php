<?php
$inData = getRequestInfo();

$searchResults = "";
$searchCount = 0;

$conn = new mysqli("localhost", "DB_USER", "DB_PASS", "DB_NAME");
if ($conn->connect_error) {
    returnWithError($conn->connect_error);
} else {
    $search = "%" . $inData["search"] . "%";
    $userID = intval($inData["userID"]);
    $limit  = isset($inData["limit"]) ? intval($inData["limit"]) : 10;
    $offset = isset($inData["offset"]) ? intval($inData["offset"]) : 0;

    $stmt = $conn->prepare("SELECT ID,FirstName,LastName,Email,Phone FROM Contacts WHERE UserID=? AND (FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ? OR Phone LIKE ?) LIMIT ? OFFSET ?");
    $stmt->bind_param("issssii", $userID, $search, $search, $search, $search, $limit, $offset);
    $stmt->execute();

    $result = $stmt->get_result();

    $contacts = [];
    while ($row = $result->fetch_assoc()) {
        $contacts[] = $row;
    }

    if (count($contacts) == 0) {
        returnWithError("No Records Found");
    } else {
        returnWithInfo($contacts);
    }

    $stmt->close();
    $conn->close();
}

function getRequestInfo()
{
    return json_decode(file_get_contents('php://input'), true);
}

function sendResultInfoAsJson($obj)
{
    header('Content-type: application/json');
    echo $obj;
}

function returnWithError($err)
{
    $retValue = '{"error":"' . $err . '"}';
    sendResultInfoAsJson($retValue);
}

function returnWithInfo($contacts)
{
    $retValue = json_encode(["results" => $contacts, "error" => ""]);
    sendResultInfoAsJson($retValue);
}
?>
