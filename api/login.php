<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? $data['usuario'] ?? '';
$senha = $data['senha'] ?? '';

if (!$email || !$senha) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Preencha todos os campos']);
    exit;
}

// ====================== LOGIN ADMIN ======================
if (($email === 'admin' || $email === 'admin@trattoria.com') && $senha === '123456') {
    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => 'Bem-vindo, Administrador!',
        'tipo' => 'admin',
        'nome' => 'Administrador'
    ]);
    exit;
}

// ====================== LOGIN CLIENTE ======================
$stmt = $pdo->prepare("SELECT * FROM clientes WHERE email = ? AND senha = ?");
$stmt->execute([$email, $senha]);
$cliente = $stmt->fetch(PDO::FETCH_ASSOC);

if ($cliente) {
    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => 'Login realizado com sucesso!',
        'tipo' => 'cliente',
        'nome' => $cliente['nome'],
        'id' => $cliente['id_cliente']
    ]);
} else {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Email ou senha incorretos']);
}
?>