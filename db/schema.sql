DROP DATABASE IF EXISTS salarosa;
CREATE DATABASE salarosa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
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
  perfil ENUM('gerente', 'cliente') NOT NULL DEFAULT 'cliente',
  is_consultora TINYINT(1) NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  senha VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- =========================
-- SERVICOS
-- =========================
CREATE TABLE servicos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duracao_min INT NOT NULL DEFAULT 60,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  exclusivo_para_consultora TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================
-- PRODUTOS
-- =========================
CREATE TABLE produtos (
  id INT NOT NULL AUTO_INCREMENT,
  nome VARCHAR(160) NOT NULL,
  unidade VARCHAR(10) NULL,
  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estoque_atual INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 0,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================
-- HORARIO_CONFIG
-- =========================
CREATE TABLE horario_config (
  id INT NOT NULL AUTO_INCREMENT,
  hora_inicio_padrao TIME NOT NULL,
  hora_fim_padrao TIME NOT NULL,
  duracao_slot_minutos INT NOT NULL DEFAULT 60,
  hora_inicio_semana TIME NULL,
  hora_fim_semana TIME NULL,
  hora_inicio_fim_semana TIME NULL,
  hora_fim_fim_semana TIME NULL,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================
-- EXCECOES_DIA 
-- =========================
CREATE TABLE excecoes_dia (
  id INT NOT NULL AUTO_INCREMENT,
  data DATE NULL,
  hora_inicio_excecao TIME NULL,
  hora_fim_excecao TIME NULL,

  recorrente TINYINT(1) DEFAULT 0,
  dias_semana VARCHAR(20) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================
-- BLOQUEIOS_SLOT
-- =========================
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
  tipo ENUM('individual', 'turma') NOT NULL,
  servico_id INT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  capacidade_maxima INT NOT NULL DEFAULT 5,
  codigo_convite VARCHAR(8) NULL,
  status ENUM(
    'pendente',
    'confirmado',
    'cancelado',
    'concluido',
    'pendente_aprovacao',
    'aprovado',
    'recusado'
  ) NOT NULL DEFAULT 'pendente_aprovacao',
  observacao VARCHAR(255) NULL,
  criado_por_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ag_codigo_convite (codigo_convite),
  KEY idx_ag_data (data),
  KEY idx_ag_status (status),
  KEY idx_ag_data_inicio (data, hora_inicio),
  KEY idx_ag_serv (servico_id),
  KEY idx_ag_criado (criado_por_user_id),
  CONSTRAINT fk_ag_serv
    FOREIGN KEY (servico_id) REFERENCES servicos(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_ag_criado
    FOREIGN KEY (criado_por_user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- AGENDAMENTO_PARTICIPANTES
-- =========================
CREATE TABLE agendamento_participantes (
  id INT NOT NULL AUTO_INCREMENT,
  agendamento_id INT NOT NULL,
  user_id INT NOT NULL,
  nome_no_momento VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ap_ag_user (agendamento_id, user_id),
  KEY idx_ap_user (user_id),
  CONSTRAINT fk_ap_ag
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ap_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- AGENDAMENTO_SLOTS
-- =========================
CREATE TABLE agendamento_slots (
  id INT NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  slot TIME NOT NULL,
  agendamento_id INT NOT NULL,
  status ENUM('ativo', 'cancelado') NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_as_data_slot (data, slot),
  KEY idx_as_ag (agendamento_id),
  KEY idx_as_data (data),
  CONSTRAINT fk_as_ag
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- VENDAS
-- =========================
CREATE TABLE vendas (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_responsavel_id INT NOT NULL,
  atendimento_id INT NULL,
  cliente_id INT NULL,
  data DATE NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  forma_pagto ENUM('dinheiro', 'cartao', 'pix') NULL,
  status_pagto ENUM('pendente', 'pago', 'cancelado', 'estornado') NOT NULL DEFAULT 'pendente',
  observacao VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_v_data (data),
  KEY idx_v_user (usuario_responsavel_id),
  KEY idx_v_ag (atendimento_id),
  KEY idx_v_cliente (cliente_id),
  CONSTRAINT fk_v_user
    FOREIGN KEY (usuario_responsavel_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_v_ag
    FOREIGN KEY (atendimento_id) REFERENCES agendamentos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_v_cliente
    FOREIGN KEY (cliente_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- VENDA_ITENS
-- =========================
CREATE TABLE venda_itens (
  id INT NOT NULL AUTO_INCREMENT,
  venda_id INT NOT NULL,
  tipo ENUM('produto', 'servico') NOT NULL,
  produto_id INT NULL,
  servico_id INT NULL,
  quantidade INT NOT NULL,
  preco_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * preco_unit) STORED,
  PRIMARY KEY (id),
  KEY idx_vi_venda (venda_id),
  KEY idx_vi_prod (produto_id),
  KEY idx_vi_serv (servico_id),
  KEY idx_vi_tipo (tipo),
  CONSTRAINT fk_vi_v
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_vi_p
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_vi_s
    FOREIGN KEY (servico_id) REFERENCES servicos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- ESTOQUE_MOVIMENTACOES
-- =========================
CREATE TABLE estoque_movimentacoes (
  id INT NOT NULL AUTO_INCREMENT,
  produto_id INT NOT NULL,
  tipo ENUM('entrada', 'saida', 'ajuste') NOT NULL,
  quantidade INT NOT NULL,
  data_ref DATE NOT NULL,
  observacao VARCHAR(255) NULL,
  venda_id INT NULL,
  agendamento_id INT NULL,
  usuario_responsavel_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_em_prod_data (produto_id, data_ref),
  KEY idx_em_data (data_ref),
  KEY idx_em_venda (venda_id),
  KEY idx_em_ag (agendamento_id),
  KEY idx_em_user (usuario_responsavel_id),
  CONSTRAINT fk_em_p
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_em_v
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_em_a
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_em_u
    FOREIGN KEY (usuario_responsavel_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- FINANCEIRO_LANCAMENTOS
-- =========================
CREATE TABLE financeiro_lancamentos (
  id INT NOT NULL AUTO_INCREMENT,
  descricao VARCHAR(200) NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  forma_pagto ENUM('dinheiro', 'cartao', 'pix') NULL,
  status ENUM('pendente', 'pago', 'cancelado', 'estornado') NOT NULL DEFAULT 'pendente',
  data_ref DATE NOT NULL,
  user_id INT NULL,
  venda_id INT NULL,
  agendamento_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_venda (venda_id),
  UNIQUE KEY uq_fin_ag_user (agendamento_id, user_id),
  KEY idx_fin_status (status),
  KEY idx_fin_data (data_ref),
  KEY idx_fin_user (user_id),
  KEY idx_fin_ag (agendamento_id),
  CONSTRAINT fk_fin_u
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_fin_v
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_fin_a
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- TRIGGERS
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
