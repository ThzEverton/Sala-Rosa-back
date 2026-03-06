DROP DATABASE IF EXISTS salarosa;
CREATE DATABASE salarosa CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE salarosa;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  telefone VARCHAR(20) NULL,
  data_nascimento DATE NULL,

  perfil ENUM('gerente','cliente') NOT NULL DEFAULT 'cliente',
  is_consultora TINYINT(1) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  senha VARCHAR(255) NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),

  CONSTRAINT chk_users_gerente_nao_consultora CHECK (
    NOT (perfil = 'gerente' AND is_consultora = 1)
  )
) ENGINE=InnoDB;

-- =========================
-- SERVICOS
-- =========================
CREATE TABLE servicos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracao_min INT NOT NULL DEFAULT 60,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  exclusivo_para_consultora TINYINT(1) NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT chk_serv_preco CHECK (preco >= 0),
  CONSTRAINT chk_serv_duracao CHECK (duracao_min > 0)
) ENGINE=InnoDB;

-- =========================
-- PRODUTOS
-- =========================
CREATE TABLE produtos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(160) NOT NULL,
  unidade VARCHAR(10) NULL,
  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0,
  estoque_atual INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT chk_prod_preco CHECK (preco_venda >= 0),
  CONSTRAINT chk_prod_estoque_nao_neg CHECK (estoque_atual >= 0),
  CONSTRAINT chk_prod_estoque_min_nao_neg CHECK (estoque_minimo >= 0)
) ENGINE=InnoDB;

-- =========================
-- CONFIG AGENDA
-- =========================
CREATE TABLE horario_config (
  id INT NOT NULL AUTO_INCREMENT,
  hora_inicio_padrao TIME NOT NULL,
  hora_fim_padrao TIME NOT NULL,
  duracao_slot_minutos INT NOT NULL DEFAULT 60,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT chk_cfg_duracao CHECK (duracao_slot_minutos > 0),
  CONSTRAINT chk_cfg_intervalo CHECK (hora_fim_padrao > hora_inicio_padrao)
) ENGINE=InnoDB;

CREATE TABLE excecoes_dia (
  id INT NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  hora_inicio_excecao TIME NULL,
  hora_fim_excecao TIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_exc_data (data),

  CONSTRAINT chk_exc_intervalo CHECK (
    (hora_inicio_excecao IS NULL OR hora_fim_excecao IS NULL)
    OR
    (hora_fim_excecao > hora_inicio_excecao)
  )
) ENGINE=InnoDB;

CREATE TABLE bloqueios_slot (
  id INT NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  slot TIME NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_bloq_data_slot (data, slot)
) ENGINE=InnoDB;

-- =========================
-- AGENDAMENTOS
-- =========================
CREATE TABLE agendamentos (
  id INT NOT NULL AUTO_INCREMENT,
  tipo ENUM('individual','turma') NOT NULL,
  servico_id INT NOT NULL,

  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,

  status ENUM('pendente','confirmado','cancelado','concluido') NOT NULL DEFAULT 'confirmado',
  observacao VARCHAR(255) NULL,
  criado_por_user_id INT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_ag_serv FOREIGN KEY (servico_id) REFERENCES servicos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_ag_criado FOREIGN KEY (criado_por_user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT chk_ag_intervalo CHECK (hora_fim > hora_inicio),

  KEY idx_ag_data (data),
  KEY idx_ag_status (status),
  KEY idx_ag_data_inicio (data, hora_inicio),
  KEY idx_ag_serv (servico_id),
  KEY idx_ag_criado (criado_por_user_id)
) ENGINE=InnoDB;

CREATE TABLE agendamento_participantes (
  id INT NOT NULL AUTO_INCREMENT,
  agendamento_id INT NOT NULL,
  user_id INT NOT NULL,
  nome_no_momento VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_ap_ag_user (agendamento_id, user_id),

  CONSTRAINT fk_ap_ag FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_ap_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  KEY idx_ap_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE agendamento_slots (
  id INT NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  slot TIME NOT NULL,
  agendamento_id INT NOT NULL,
  status ENUM('ativo','cancelado') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_as_data_slot (data, slot),

  CONSTRAINT fk_as_ag FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  KEY idx_as_ag (agendamento_id),
  KEY idx_as_data (data)
) ENGINE=InnoDB;

-- =========================
-- VENDAS
-- =========================
CREATE TABLE vendas (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_responsavel_id INT NOT NULL,
  atendimento_id INT NULL,

  data DATE NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,

  forma_pagto ENUM('dinheiro','cartao','pix') NULL,
  status_pagto ENUM('pendente','pago','cancelado','estornado') NOT NULL DEFAULT 'pendente',
  observacao VARCHAR(255) NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_v_user FOREIGN KEY (usuario_responsavel_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_v_ag FOREIGN KEY (atendimento_id) REFERENCES agendamentos(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT chk_v_valor CHECK (valor_total >= 0),

  KEY idx_v_data (data),
  KEY idx_v_user (usuario_responsavel_id),
  KEY idx_v_ag (atendimento_id)
) ENGINE=InnoDB;

CREATE TABLE venda_itens (
  id INT NOT NULL AUTO_INCREMENT,
  venda_id INT NOT NULL,

  tipo ENUM('produto','servico') NOT NULL,
  produto_id INT NULL,
  servico_id INT NULL,

  quantidade INT NOT NULL,
  preco_unit DECIMAL(10,2) NOT NULL DEFAULT 0,

  subtotal DECIMAL(10,2)
    GENERATED ALWAYS AS (quantidade * preco_unit) STORED,

  PRIMARY KEY (id),

  CONSTRAINT fk_vi_v FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT fk_vi_p FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_vi_s FOREIGN KEY (servico_id) REFERENCES servicos(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT chk_vi_quant CHECK (quantidade > 0),
  CONSTRAINT chk_vi_preco CHECK (preco_unit >= 0),

  KEY idx_vi_venda (venda_id),
  KEY idx_vi_prod (produto_id),
  KEY idx_vi_serv (servico_id),
  KEY idx_vi_tipo (tipo)
) ENGINE=InnoDB;

-- =========================
-- ESTOQUE MOVIMENTAÇÕES
-- =========================
CREATE TABLE estoque_movimentacoes (
  id INT NOT NULL AUTO_INCREMENT,
  produto_id INT NOT NULL,

  tipo ENUM('entrada','saida','ajuste') NOT NULL,
  quantidade INT NOT NULL,

  data_ref DATE NOT NULL,
  observacao VARCHAR(255) NULL,

  venda_id INT NULL,
  agendamento_id INT NULL,
  usuario_responsavel_id INT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_em_p FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  CONSTRAINT fk_em_v FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_em_a FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_em_u FOREIGN KEY (usuario_responsavel_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT chk_em_quant_regra CHECK (
    (tipo IN ('entrada','saida') AND quantidade > 0)
    OR
    (tipo = 'ajuste' AND quantidade <> 0)
  ),

  KEY idx_em_prod_data (produto_id, data_ref),
  KEY idx_em_data (data_ref),
  KEY idx_em_venda (venda_id),
  KEY idx_em_ag (agendamento_id)
) ENGINE=InnoDB;

-- =========================
-- FINANCEIRO
-- =========================
CREATE TABLE financeiro_lancamentos (
  id INT NOT NULL AUTO_INCREMENT,

  descricao VARCHAR(200) NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0,

  forma_pagto ENUM('dinheiro','cartao','pix') NULL,
  status ENUM('pendente','pago','cancelado','estornado') NOT NULL DEFAULT 'pendente',

  data_ref DATE NOT NULL,

  user_id INT NULL,
  venda_id INT NULL,
  agendamento_id INT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  CONSTRAINT fk_fin_u FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_fin_v FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT fk_fin_a FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON UPDATE CASCADE ON DELETE SET NULL,

  CONSTRAINT chk_fin_valor CHECK (valor >= 0),

  UNIQUE KEY uq_fin_venda (venda_id),
  UNIQUE KEY uq_fin_ag_user (agendamento_id, user_id),

  KEY idx_fin_status (status),
  KEY idx_fin_data (data_ref),
  KEY idx_fin_user (user_id),
  KEY idx_fin_ag (agendamento_id)
) ENGINE=InnoDB;

-- =========================
-- TRIGGERS PARA venda_itens
-- mantém a lógica original sem mudar a modelagem
-- =========================
DELIMITER $$

CREATE TRIGGER trg_venda_itens_bi
BEFORE INSERT ON venda_itens
FOR EACH ROW
BEGIN
  IF NEW.tipo = 'produto' THEN
    IF NEW.produto_id IS NULL OR NEW.servico_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Para tipo produto: produto_id obrigatório e servico_id deve ser NULL';
    END IF;
  ELSEIF NEW.tipo = 'servico' THEN
    IF NEW.servico_id IS NULL OR NEW.produto_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Para tipo servico: servico_id obrigatório e produto_id deve ser NULL';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_venda_itens_bu
BEFORE UPDATE ON venda_itens
FOR EACH ROW
BEGIN
  IF NEW.tipo = 'produto' THEN
    IF NEW.produto_id IS NULL OR NEW.servico_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Para tipo produto: produto_id obrigatório e servico_id deve ser NULL';
    END IF;
  ELSEIF NEW.tipo = 'servico' THEN
    IF NEW.servico_id IS NULL OR NEW.produto_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Para tipo servico: servico_id obrigatório e produto_id deve ser NULL';
    END IF;
  END IF;
END$$

DELIMITER ;

-- =========================
-- SEED CONFIG
-- =========================
INSERT INTO horario_config (hora_inicio_padrao, hora_fim_padrao, duracao_slot_minutos)
VALUES ('08:00:00', '18:00:00', 60);


INSERT INTO users (nome, email, perfil, is_consultora, ativo, senha)
VALUES ('Admin', 'admin@salarosa.com', 'gerente', 0, 1, '123');

INSERT INTO servicos (nome, preco, duracao_min)
VALUES ('Design de sobrancelha', 50.00, 60);

INSERT INTO produtos (nome, unidade, preco_venda, estoque_atual, estoque_minimo)
VALUES ('Henna', 'UN', 25.00, 10, 2);

INSERT INTO vendas (usuario_responsavel_id, data, valor_total, forma_pagto, status_pagto)
VALUES (1, CURDATE(), 50.00, 'pix', 'pago');

-- certo
INSERT INTO venda_itens (venda_id, tipo, produto_id, servico_id, quantidade, preco_unit)
VALUES (1, 'produto', 1, NULL, 2, 25.00);

-- errado
INSERT INTO venda_itens (venda_id, tipo, produto_id, servico_id, quantidade, preco_unit)
VALUES (1, 'produto', NULL, 1, 1, 50.00);