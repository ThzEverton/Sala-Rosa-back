USE salarosa;

-- =========================
-- USERS
-- =========================
INSERT INTO users
(id, nome, email, telefone, data_nascimento, perfil, is_consultora, ativo, senha)
VALUES
(1, 'Administrador', 'admin@salarosa.com', '18999990001', '1985-01-01', 'gerente', 0, 1, '123456'),

(2, 'Mariana Oliveira', 'mariana@salarosa.com', '18999990002', '1992-08-15', 'cliente', 1, 1, '123456'),
(3, 'Camila Souza', 'camila@salarosa.com', '18999990003', '1995-03-22', 'cliente', 1, 1, '123456'),
(4, 'Fernanda Lima', 'fernanda@salarosa.com', '18999990004', '1988-11-02', 'cliente', 0, 1, '123456'),
(5, 'Juliana Martins', 'juliana@salarosa.com', '18999990005', '1997-01-18', 'cliente', 0, 1, '123456'),
(6, 'Patricia Alves', 'patricia@salarosa.com', '18999990006', '1991-06-30', 'cliente', 0, 1, '123456'),
(7, 'Bianca Rocha', 'bianca@salarosa.com', '18999990007', '1994-09-12', 'cliente', 0, 1, '123456'),
(8, 'Tatiane Costa', 'tatiane@salarosa.com', '18999990008', '1989-12-05', 'cliente', 1, 1, '123456');
-- =========================
-- SERVICOS
-- =========================
INSERT INTO servicos
(nome, descricao, preco, duracao_min, ativo, exclusivo_para_consultora)
VALUES
('Limpeza de Pele', 'Procedimento estético facial para higienização profunda da pele.', 120.00, 60, 1, 0),
('Massagem Relaxante', 'Sessão de massagem corporal relaxante.', 150.00, 60, 1, 0),
('Consultoria de Beleza', 'Atendimento personalizado para consultoras.', 90.00, 45, 1, 1),
('Workshop de Maquiagem', 'Turma prática de maquiagem.', 200.00, 120, 1, 0),
('Spa dos Pés', 'Tratamento de relaxamento e hidratação para os pés.', 80.00, 40, 1, 0),
('Treinamento de Produtos', 'Capacitação interna para consultoras.', 180.00, 90, 1, 1);

-- =========================
-- PRODUTOS
-- =========================
INSERT INTO produtos
(nome, unidade, preco_venda, estoque_atual, estoque_minimo, ativo)
VALUES
('Creme Hidratante Facial', 'UN', 45.00, 30, 5, 1),
('Sabonete Facial', 'UN', 25.00, 40, 10, 1),
('Óleo Corporal Relaxante', 'UN', 55.00, 20, 5, 1),
('Máscara Facial de Argila', 'UN', 35.00, 25, 5, 1),
('Kit Maquiagem Básico', 'KIT', 120.00, 15, 3, 1),
('Escalda Pés Aromático', 'UN', 18.00, 50, 10, 1),
('Sérum Vitamina C', 'UN', 69.90, 18, 4, 1),
('Protetor Solar Facial', 'UN', 59.90, 22, 5, 1);

-- =========================
-- HORARIO_CONFIG
-- =========================
INSERT INTO horario_config
(hora_inicio_padrao, hora_fim_padrao, duracao_slot_minutos, hora_inicio_semana, hora_fim_semana, hora_inicio_fim_semana, hora_fim_fim_semana)
VALUES
('08:00:00', '18:00:00', 60, '08:00:00', '18:00:00', '08:00:00', '12:00:00');

-- =========================
-- EXCECOES_DIA
-- =========================
INSERT INTO excecoes_dia
(data, hora_inicio_excecao, hora_fim_excecao)
VALUES
('2026-03-20', '10:00:00', '16:00:00'),
('2026-03-25', NULL, NULL),
('2026-03-28', '08:00:00', '12:00:00');

-- =========================
-- BLOQUEIOS_SLOT
-- =========================
INSERT INTO bloqueios_slot
(data, slot)
VALUES
('2026-03-20', '12:00:00'),
('2026-03-20', '13:00:00'),
('2026-03-21', '09:00:00'),
('2026-03-22', '15:00:00');

-- =========================
-- AGENDAMENTOS
-- =========================
INSERT INTO agendamentos
(tipo, servico_id, data, hora_inicio, hora_fim, capacidade_maxima, codigo_convite, status, observacao, criado_por_user_id)
VALUES
('individual', 1, '2026-03-20', '10:00:00', '11:00:00', 1, NULL, 'confirmado', 'Atendimento individual de limpeza de pele.', 1),
('individual', 2, '2026-03-20', '11:00:00', '12:00:00', 1, NULL, 'pendente', 'Massagem agendada aguardando confirmação.', 1),
('turma', 4, '2026-03-21', '14:00:00', '16:00:00', 5, 'MKT2026A', 'aprovado', 'Turma aberta de workshop de maquiagem.', 1),
('turma', 6, '2026-03-22', '09:00:00', '10:30:00', 4, 'CONS2026', 'pendente_aprovacao', 'Treinamento interno para consultoras.', 1),
('individual', 5, '2026-03-23', '15:00:00', '15:40:00', 1, NULL, 'concluido', 'Spa dos pés realizado.', 1),
('turma', 4, '2026-03-24', '18:00:00', '20:00:00', 5, 'MAKEB24', 'recusado', 'Turma cancelada por baixa adesão.', 1),
('individual', 3, '2026-03-25', '08:00:00', '08:45:00', 1, NULL, 'cancelado', 'Consultoria cancelada pela cliente.', 1),
('individual', 1, '2026-03-26', '09:00:00', '10:00:00', 1, NULL, 'confirmado', 'Retorno facial.', 1);

-- =========================
-- AGENDAMENTO_PARTICIPANTES
-- =========================
INSERT INTO agendamento_participantes
(agendamento_id, user_id, nome_no_momento)
VALUES
(1, 4, 'Fernanda Lima'),
(2, 5, 'Juliana Martins'),
(3, 2, 'Mariana Oliveira'),
(3, 3, 'Camila Souza'),
(3, 6, 'Patricia Alves'),
(4, 8, 'Tatiane Costa'),
(5, 7, 'Bianca Rocha'),
(8, 6, 'Patricia Alves');

-- =========================
-- AGENDAMENTO_SLOTS
-- =========================
INSERT INTO agendamento_slots
(data, slot, agendamento_id, status)
VALUES
('2026-03-20', '10:00:00', 1, 'ativo'),
('2026-03-20', '11:00:00', 2, 'ativo'),
('2026-03-21', '14:00:00', 3, 'ativo'),
('2026-03-22', '09:00:00', 4, 'ativo'),
('2026-03-23', '15:00:00', 5, 'ativo'),
('2026-03-24', '18:00:00', 6, 'cancelado'),
('2026-03-25', '08:00:00', 7, 'cancelado'),
('2026-03-26', '09:00:00', 8, 'ativo');

-- =========================
-- VENDAS
-- =========================
INSERT INTO vendas
(usuario_responsavel_id, atendimento_id, data, valor_total, forma_pagto, status_pagto, observacao)
VALUES
(1, 1, '2026-03-20', 165.00, 'pix', 'pago', 'Venda de serviço com produto adicional.'),
(1, 3, '2026-03-21', 400.00, 'cartao', 'pago', 'Venda referente à turma de workshop.'),
(1, 5, '2026-03-23', 98.00, 'dinheiro', 'pago', 'Spa dos pés com item complementar.'),
(1, NULL, '2026-03-24', 94.90, 'pix', 'pendente', 'Venda avulsa de produtos.'),
(1, 8, '2026-03-26', 120.00, 'cartao', 'pago', 'Atendimento facial.');

-- =========================
-- VENDA_ITENS
-- =========================
INSERT INTO venda_itens
(venda_id, tipo, produto_id, servico_id, quantidade, preco_unit)
VALUES
(1, 'servico', NULL, 1, 1, 120.00),
(1, 'produto', 1, NULL, 1, 45.00),

(2, 'servico', NULL, 4, 2, 200.00),

(3, 'servico', NULL, 5, 1, 80.00),
(3, 'produto', 6, NULL, 1, 18.00),

(4, 'produto', 7, NULL, 1, 69.90),
(4, 'produto', 2, NULL, 1, 25.00),

(5, 'servico', NULL, 1, 1, 120.00);

-- =========================
-- ESTOQUE_MOVIMENTACOES
-- =========================
INSERT INTO estoque_movimentacoes
(produto_id, tipo, quantidade, data_ref, observacao, venda_id, agendamento_id, usuario_responsavel_id)
VALUES
(1, 'saida', 1, '2026-03-20', 'Venda no atendimento de limpeza de pele.', 1, 1, 1),
(6, 'saida', 1, '2026-03-23', 'Uso/venda no Spa dos Pés.', 3, 5, 1),
(7, 'saida', 1, '2026-03-24', 'Venda avulsa do sérum.', 4, NULL, 1),
(2, 'saida', 1, '2026-03-24', 'Venda avulsa do sabonete facial.', 4, NULL, 1),
(3, 'entrada', 10, '2026-03-18', 'Reposição de estoque.', NULL, NULL, 1),
(4, 'ajuste', 2, '2026-03-19', 'Ajuste após conferência física.', NULL, NULL, 1);

-- =========================
-- FINANCEIRO_LANCAMENTOS
-- =========================
INSERT INTO financeiro_lancamentos
(descricao, valor, forma_pagto, status, data_ref, user_id, venda_id, agendamento_id)
VALUES
('Recebimento venda #1', 165.00, 'pix', 'pago', '2026-03-20', 4, 1, 1),
('Recebimento venda #2', 400.00, 'cartao', 'pago', '2026-03-21', 2, 2, 3),
('Recebimento venda #3', 98.00, 'dinheiro', 'pago', '2026-03-23', 7, 3, 5),
('Recebimento venda #4', 94.90, 'pix', 'pendente', '2026-03-24', 6, 4, NULL),
('Recebimento venda #5', 120.00, 'cartao', 'pago', '2026-03-26', 6, 5, 8),
('Cobrança participação workshop - Camila Souza', 200.00, 'cartao', 'pago', '2026-03-21', 3, NULL, 3),
('Cobrança participação workshop - Patricia Alves', 200.00, 'pix', 'pendente', '2026-03-21', 6, NULL, 3),
('Cobrança treinamento consultoras - Tatiane Costa', 180.00, 'pix', 'pendente', '2026-03-22', 8, NULL, 4);