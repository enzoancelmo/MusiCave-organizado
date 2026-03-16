<?php

$conn = new mysqli("localhost", "usuario", "senha", "banco");

$username = $_POST['username'];
$senha = $_POST['senha'];

$stmt = $conn->prepare("SELECT senha_hash FROM usuarios WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows > 0) {

    $row = $result->fetch_assoc();

    if (password_verify($senha, $row['senha_hash'])) {
        echo "Login realizado com sucesso!";
    } else {
        echo "Senha incorreta!";
    }

} else {
    echo "Usuário não encontrado!";
}

?>