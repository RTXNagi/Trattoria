<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require 'config.php';

$stmt = $pdo->query("SELECT * FROM ingredientes ORDER BY nome");
$estoque = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($estoque);
?>