<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$produto     = $data['produto'] ?? '';
$quantidade  = (int)($data['quantidade'] ?? 0);
$motivo      = $data['motivo'] ?? '';
$responsavel = $data['responsavel'] ?? '';

if (!$produto || $quantidade <= 0) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id_ingrediente, estoque FROM ingredientes WHERE nome = ?");
    $stmt->execute([$produto]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Produto não encontrado no estoque']);
        exit;
    }

    if ($item['estoque'] < $quantidade) {
        echo json_encode(['status' => 'erro', 'mensagem' => 'Estoque insuficiente']);
        exit;
    }

    $novoEstoque = $item['estoque'] - $quantidade;
    $update = $pdo->prepare("UPDATE ingredientes SET estoque = ? WHERE id_ingrediente = ?");
    $update->execute([$novoEstoque, $item['id_ingrediente']]);

    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => "Saída registrada! Estoque atualizado."
    ]);
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => $e->getMessage()]);
}
?>