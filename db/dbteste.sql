-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema salarosa
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema salarosa
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `salarosa` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `salarosa` ;

-- -----------------------------------------------------
-- Table `salarosa`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `email` VARCHAR(180) NOT NULL,
  `telefone` VARCHAR(20) NULL DEFAULT NULL,
  `data_nascimento` DATE NULL DEFAULT NULL,
  `perfil` ENUM('gerente', 'cliente') NOT NULL DEFAULT 'cliente',
  `is_consultora` TINYINT(1) NOT NULL DEFAULT '0',
  `ativo` TINYINT(1) NOT NULL DEFAULT '1',
  `senha` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_users_email` (`email` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`servicos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`servicos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `descricao` TEXT NULL DEFAULT NULL,
  `preco` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `duracao_min` INT NOT NULL DEFAULT '60',
  `ativo` TINYINT(1) NOT NULL DEFAULT '1',
  `exclusivo_para_consultora` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 124
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`agendamentos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`agendamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('individual', 'turma') NOT NULL,
  `servico_id` INT NOT NULL,
  `data` DATE NOT NULL,
  `hora_inicio` TIME NOT NULL,
  `hora_fim` TIME NOT NULL,
  `capacidade_maxima` INT NOT NULL DEFAULT '5',
  `codigo_convite` VARCHAR(8) NULL DEFAULT NULL,
  `status` ENUM('pendente', 'confirmado', 'cancelado', 'concluido', 'pendente_aprovacao', 'aprovado', 'recusado') NOT NULL DEFAULT 'pendente_aprovacao',
  `observacao` VARCHAR(255) NULL DEFAULT NULL,
  `criado_por_user_id` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `codigo_convite` (`codigo_convite` ASC) VISIBLE,
  INDEX `idx_ag_data` (`data` ASC) VISIBLE,
  INDEX `idx_ag_status` (`status` ASC) VISIBLE,
  INDEX `idx_ag_data_inicio` (`data` ASC, `hora_inicio` ASC) VISIBLE,
  INDEX `idx_ag_serv` (`servico_id` ASC) VISIBLE,
  INDEX `idx_ag_criado` (`criado_por_user_id` ASC) VISIBLE,
  INDEX `idx_agendamentos_codigo_convite` (`codigo_convite` ASC) VISIBLE,
  CONSTRAINT `fk_ag_criado`
    FOREIGN KEY (`criado_por_user_id`)
    REFERENCES `salarosa`.`users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ag_serv`
    FOREIGN KEY (`servico_id`)
    REFERENCES `salarosa`.`servicos` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 11
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`agendamento_participantes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`agendamento_participantes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `agendamento_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `nome_no_momento` VARCHAR(120) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_ap_ag_user` (`agendamento_id` ASC, `user_id` ASC) VISIBLE,
  INDEX `idx_ap_user` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_ap_ag`
    FOREIGN KEY (`agendamento_id`)
    REFERENCES `salarosa`.`agendamentos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ap_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `salarosa`.`users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 7
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`agendamento_slots`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`agendamento_slots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `data` DATE NOT NULL,
  `slot` TIME NOT NULL,
  `agendamento_id` INT NOT NULL,
  `status` ENUM('ativo', 'cancelado') NOT NULL DEFAULT 'ativo',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_as_data_slot` (`data` ASC, `slot` ASC) VISIBLE,
  INDEX `idx_as_ag` (`agendamento_id` ASC) VISIBLE,
  INDEX `idx_as_data` (`data` ASC) VISIBLE,
  CONSTRAINT `fk_as_ag`
    FOREIGN KEY (`agendamento_id`)
    REFERENCES `salarosa`.`agendamentos` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`bloqueios_slot`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`bloqueios_slot` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `data` DATE NOT NULL,
  `slot` TIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_bloq_data_slot` (`data` ASC, `slot` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 121
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`produtos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`produtos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(160) NOT NULL,
  `unidade` VARCHAR(10) NULL DEFAULT NULL,
  `preco_venda` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `estoque_atual` INT NOT NULL DEFAULT '0',
  `estoque_minimo` INT NOT NULL DEFAULT '0',
  `ativo` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 7
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`vendas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`vendas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_responsavel_id` INT NOT NULL,
  `atendimento_id` INT NULL DEFAULT NULL,
  `data` DATE NOT NULL,
  `valor_total` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `forma_pagto` ENUM('dinheiro', 'cartao', 'pix') NULL DEFAULT NULL,
  `status_pagto` ENUM('pendente', 'pago', 'cancelado', 'estornado') NOT NULL DEFAULT 'pendente',
  `observacao` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_v_data` (`data` ASC) VISIBLE,
  INDEX `idx_v_user` (`usuario_responsavel_id` ASC) VISIBLE,
  INDEX `idx_v_ag` (`atendimento_id` ASC) VISIBLE,
  CONSTRAINT `fk_v_ag`
    FOREIGN KEY (`atendimento_id`)
    REFERENCES `salarosa`.`agendamentos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_v_user`
    FOREIGN KEY (`usuario_responsavel_id`)
    REFERENCES `salarosa`.`users` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`estoque_movimentacoes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`estoque_movimentacoes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `produto_id` INT NOT NULL,
  `tipo` ENUM('entrada', 'saida', 'ajuste') NOT NULL,
  `quantidade` INT NOT NULL,
  `data_ref` DATE NOT NULL,
  `observacao` VARCHAR(255) NULL DEFAULT NULL,
  `venda_id` INT NULL DEFAULT NULL,
  `agendamento_id` INT NULL DEFAULT NULL,
  `usuario_responsavel_id` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_em_u` (`usuario_responsavel_id` ASC) VISIBLE,
  INDEX `idx_em_prod_data` (`produto_id` ASC, `data_ref` ASC) VISIBLE,
  INDEX `idx_em_data` (`data_ref` ASC) VISIBLE,
  INDEX `idx_em_venda` (`venda_id` ASC) VISIBLE,
  INDEX `idx_em_ag` (`agendamento_id` ASC) VISIBLE,
  CONSTRAINT `fk_em_a`
    FOREIGN KEY (`agendamento_id`)
    REFERENCES `salarosa`.`agendamentos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_em_p`
    FOREIGN KEY (`produto_id`)
    REFERENCES `salarosa`.`produtos` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_em_u`
    FOREIGN KEY (`usuario_responsavel_id`)
    REFERENCES `salarosa`.`users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_em_v`
    FOREIGN KEY (`venda_id`)
    REFERENCES `salarosa`.`vendas` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`excecoes_dia`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`excecoes_dia` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `data` DATE NOT NULL,
  `hora_inicio_excecao` TIME NULL DEFAULT NULL,
  `hora_fim_excecao` TIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_exc_data` (`data` ASC) VISIBLE)
ENGINE = InnoDB
AUTO_INCREMENT = 7
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`financeiro_lancamentos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`financeiro_lancamentos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `descricao` VARCHAR(200) NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `forma_pagto` ENUM('dinheiro', 'cartao', 'pix') NULL DEFAULT NULL,
  `status` ENUM('pendente', 'pago', 'cancelado', 'estornado') NOT NULL DEFAULT 'pendente',
  `data_ref` DATE NOT NULL,
  `user_id` INT NULL DEFAULT NULL,
  `venda_id` INT NULL DEFAULT NULL,
  `agendamento_id` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_fin_venda` (`venda_id` ASC) VISIBLE,
  UNIQUE INDEX `uq_fin_ag_user` (`agendamento_id` ASC, `user_id` ASC) VISIBLE,
  INDEX `idx_fin_status` (`status` ASC) VISIBLE,
  INDEX `idx_fin_data` (`data_ref` ASC) VISIBLE,
  INDEX `idx_fin_user` (`user_id` ASC) VISIBLE,
  INDEX `idx_fin_ag` (`agendamento_id` ASC) VISIBLE,
  CONSTRAINT `fk_fin_a`
    FOREIGN KEY (`agendamento_id`)
    REFERENCES `salarosa`.`agendamentos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_u`
    FOREIGN KEY (`user_id`)
    REFERENCES `salarosa`.`users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_v`
    FOREIGN KEY (`venda_id`)
    REFERENCES `salarosa`.`vendas` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`horario_config`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`horario_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `hora_inicio_padrao` TIME NOT NULL,
  `hora_fim_padrao` TIME NOT NULL,
  `duracao_slot_minutos` INT NOT NULL DEFAULT '60',
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  `hora_inicio_semana` TIME NULL DEFAULT NULL,
  `hora_fim_semana` TIME NULL DEFAULT NULL,
  `hora_inicio_fim_semana` TIME NULL DEFAULT NULL,
  `hora_fim_fim_semana` TIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB
AUTO_INCREMENT = 5
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `salarosa`.`venda_itens`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `salarosa`.`venda_itens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `venda_id` INT NOT NULL,
  `tipo` ENUM('produto', 'servico') NOT NULL,
  `produto_id` INT NULL DEFAULT NULL,
  `servico_id` INT NULL DEFAULT NULL,
  `quantidade` INT NOT NULL,
  `preco_unit` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` DECIMAL(10,2) GENERATED ALWAYS AS ((`quantidade` * `preco_unit`)) STORED,
  PRIMARY KEY (`id`),
  INDEX `idx_vi_venda` (`venda_id` ASC) VISIBLE,
  INDEX `idx_vi_prod` (`produto_id` ASC) VISIBLE,
  INDEX `idx_vi_serv` (`servico_id` ASC) VISIBLE,
  INDEX `idx_vi_tipo` (`tipo` ASC) VISIBLE,
  CONSTRAINT `fk_vi_p`
    FOREIGN KEY (`produto_id`)
    REFERENCES `salarosa`.`produtos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_vi_s`
    FOREIGN KEY (`servico_id`)
    REFERENCES `salarosa`.`servicos` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_vi_v`
    FOREIGN KEY (`venda_id`)
    REFERENCES `salarosa`.`vendas` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;

USE `salarosa`;

DELIMITER $$
USE `salarosa`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `salarosa`.`trg_venda_itens_bi`
BEFORE INSERT ON `salarosa`.`venda_itens`
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

USE `salarosa`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `salarosa`.`trg_venda_itens_bu`
BEFORE UPDATE ON `salarosa`.`venda_itens`
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

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
