<?php
$host = 'localhost';
$db   = 'trattoria';
$user = 'root';
$pass = ''; // senha do XAMPP

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['erro' => 'Erro na conexão: ' . $e->getMessage()]);
    exit;
}
?>