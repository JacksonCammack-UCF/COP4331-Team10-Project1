<?php
    $inData = getRequestInfo();

    $searchResults = "";
    $searchCount = 0;

    $conn = new mysqli("localhost","Jackson_Cammack","COP4331-Team10A","COP4331");
    if($conn->connect_error)
    {
        returnWithError($conn->connect_error);
    }
    else
    {
        $searchName = "%".$inData["search"]."%";

        $stmt = $conn->prepare("SELECT * FROM Contacts WHERE (FirstName LIKE ? OR LastName LIKE ? OR Email LIKE ? OR Phone LIKE ?) AND UserID=?");
        $stmt->bind_param("ssssi", $searchName, $searchName, $searchName, $searchName, $inData["userID"]);
        $stmt->execute();
        
        $result = $stmt->get_result();
        
        while($row = $result->fetch_assoc())
        {
            if($searchCount > 0)
            {
                $searchResults .= ",";
            }
            $searchCount++;
            $searchResults .= '{"id":"'.$row["ID"].'","firstName":"'.$row["FirstName"].'","lastName":"'.$row["LastName"].'","phone":"'.$row["Phone"].'","email":"'.$row["Email"].'"}';
        }
        
        if($searchCount == 0)
        {
            returnWithError("No Contacts Found");
        }
        else
        {
            returnWithInfo($searchResults);
        }
        
        $stmt->close();
        $conn->close();
    }
    
    function getRequestInfo()
    {
        return json_decode(file_get_contents("php://input"), true);
    }

    function sendResultInfoAsJson($obj)
    {
        header("Content-type:application/json");
        echo $obj;
    }
    
    function returnWithError($err)
    {
        $retValue = '{"results":[],"error":"'.$err.'"}';
        sendResultInfoAsJson($retValue);
    }
    
    function returnWithInfo($searchResults)
    {
        $retValue = '{"results":['.$searchResults.'],"error":""}';
        sendResultInfoAsJson($retValue);
    }
?>
