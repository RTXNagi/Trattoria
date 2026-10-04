<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require 'config.php';

$data = json_decode(file_get_contents('php://input'), true);

$produto     = $data['produto'] ?? '';
$quantidade  = (int)($data['quantidade'] ?? 0);
$lote        = $data['lote'] ?? '';
$responsavel = $data['responsavel'] ?? '';

if (!$produto || $quantidade <= 0) {
    echo json_encode(['status' => 'erro', 'mensagem' => 'Dados inválidos']);
    exit;
}

try {
    // Verifica se o produto já existe
    $stmt = $pdo->prepare("SELECT id_ingrediente, estoque FROM ingredientes WHERE nome = ?");
    $stmt->execute([$produto]);
    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($item) {
        // Atualiza quantidade
        $novoEstoque = $item['estoque'] + $quantidade;
        $update = $pdo->prepare("UPDATE ingredientes SET estoque = ? WHERE id_ingrediente = ?");
        $update->execute([$novoEstoque, $item['id_ingrediente']]);
    } else {
        // Cria novo item
        $insert = $pdo->prepare("INSERT INTO ingredientes (nome, estoque) VALUES (?, ?)");
        $insert->execute([$produto, $quantidade]);
    }

    echo json_encode([
        'status' => 'sucesso',
        'mensagem' => "Chegada registrada! Estoque atualizado."
    ]);
} catch (Exception $e) {
    echo json_encode(['status' => 'erro', 'mensagem' => $e->getMessage()]);
}
?>