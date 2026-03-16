<?php

$conn = new mysqli("localhost", "usuario", "senha", "banco");

$username = $_POST['username'];
$email = $_POST['email'];
$senha = $_POST['senha'];

$senha_hash = password_hash($senha, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO usuarios (username, email, senha_hash) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $username, $email, $senha_hash);

$stmt->execute();

echo "Cadastro realizado com sucesso!";

?>