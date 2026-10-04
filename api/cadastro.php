<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$nome     = $data['nome'] ?? '';
$email    = $data['email'] ?? '';
$telefone = $data['telefone'] ?? '';
$senha    = $data['senha'] ?? '';
$endereco = $data['endereco'] ?? '';

if (!$nome || !$email || !$senha) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Preencha os campos obrigatórios']);
    exit;
}

// Verifica se email já existe
$check = $pdo->prepare("SELECT id_cliente FROM clientes WHERE email = ?");
$check->execute([$email]);

if ($check->fetch()) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Este email já está cadastrado']);
    exit;
}

try {
    $stmt = $pdo->prepare("INSERT INTO clientes (nome, telefone, email, endereco, senha) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$nome, $telefone, $email, $endereco, $senha]);

    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => 'Cadastro realizado com sucesso!'
    ]);
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Erro ao cadastrar: ' . $e->getMessage()]);
}
?>