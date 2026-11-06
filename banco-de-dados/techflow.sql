-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: techflow
-- ------------------------------------------------------
-- Server version	8.0.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agendamentosos`
--

DROP TABLE IF EXISTS `agendamentosos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agendamentosos` (
  `idAgendamento` int NOT NULL AUTO_INCREMENT,
  `idOS` int NOT NULL,
  `dataAgendamento` date NOT NULL,
  `horaAgendamento` time NOT NULL,
  `observacao` varchar(500) DEFAULT NULL,
  `dataCadastro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idAgendamento`),
  KEY `idx_agendamento_data` (`dataAgendamento`,`horaAgendamento`),
  KEY `idx_agendamento_os` (`idOS`),
  CONSTRAINT `fk_agendamento_os` FOREIGN KEY (`idOS`) REFERENCES `ordensservico` (`idOS`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `idCategoria` int NOT NULL AUTO_INCREMENT,
  `nomeCategoria` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idCategoria`),
  UNIQUE KEY `nomeCategoria` (`nomeCategoria`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `equipamentos`
--

DROP TABLE IF EXISTS `equipamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipamentos` (
  `idEquipamento` int NOT NULL AUTO_INCREMENT,
  `idCliente` int NOT NULL,
  `idCategoria` int NOT NULL,
  `nomeEquipamento` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `marca` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `dataCadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idEquipamento`),
  KEY `idCliente` (`idCliente`),
  KEY `idCategoria` (`idCategoria`),
  CONSTRAINT `equipamentos_ibfk_1` FOREIGN KEY (`idCliente`) REFERENCES `usuarios` (`idUsuario`),
  CONSTRAINT `equipamentos_ibfk_2` FOREIGN KEY (`idCategoria`) REFERENCES `categorias` (`idCategoria`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historicoatribuicoes`
--

DROP TABLE IF EXISTS `historicoatribuicoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historicoatribuicoes` (
  `idAtribuicao` int NOT NULL AUTO_INCREMENT,
  `idOS` int NOT NULL,
  `idTecnico` int NOT NULL,
  `dataAtribuicao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idAtribuicao`),
  KEY `idOS` (`idOS`),
  KEY `idTecnico` (`idTecnico`),
  CONSTRAINT `historicoatribuicoes_ibfk_1` FOREIGN KEY (`idOS`) REFERENCES `ordensservico` (`idOS`),
  CONSTRAINT `historicoatribuicoes_ibfk_2` FOREIGN KEY (`idTecnico`) REFERENCES `usuarios` (`idUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historicostatus`
--

DROP TABLE IF EXISTS `historicostatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historicostatus` (
  `idHistorico` int NOT NULL AUTO_INCREMENT,
  `idOS` int NOT NULL,
  `statusAnterior` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statusNovo` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataAlteracao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idHistorico`),
  KEY `idOS` (`idOS`),
  CONSTRAINT `historicostatus_ibfk_1` FOREIGN KEY (`idOS`) REFERENCES `ordensservico` (`idOS`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ocorrenciasos`
--

DROP TABLE IF EXISTS `ocorrenciasos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ocorrenciasos` (
  `idOcorrencia` int NOT NULL AUTO_INCREMENT,
  `idOS` int NOT NULL,
  `idTecnico` int NOT NULL,
  `descricao` text NOT NULL,
  `dataRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idOcorrencia`),
  KEY `idx_ocorrencia_os` (`idOS`),
  KEY `idx_ocorrencia_tecnico` (`idTecnico`),
  CONSTRAINT `fk_ocorrencia_os` FOREIGN KEY (`idOS`) REFERENCES `ordensservico` (`idOS`),
  CONSTRAINT `fk_ocorrencia_tecnico` FOREIGN KEY (`idTecnico`) REFERENCES `usuarios` (`idUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordensservico`
--

DROP TABLE IF EXISTS `ordensservico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordensservico` (
  `idOS` int NOT NULL AUTO_INCREMENT,
  `idCliente` int NOT NULL,
  `idEquipamento` int NOT NULL,
  `idTipoServico` int NOT NULL,
  `idTecnico` int DEFAULT NULL,
  `descricaoProblema` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `diagnostico` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `solucaoAplicada` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `statusOS` enum('Aberta','Em análise','Em andamento','Aguardando peça','Concluída','Cancelada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Aberta',
  `justificativaCancelamento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `dataAbertura` datetime DEFAULT CURRENT_TIMESTAMP,
  `dataConclusao` datetime DEFAULT NULL,
  `dataCancelamento` datetime DEFAULT NULL,
  PRIMARY KEY (`idOS`),
  KEY `idCliente` (`idCliente`),
  KEY `idEquipamento` (`idEquipamento`),
  KEY `idTipoServico` (`idTipoServico`),
  KEY `idTecnico` (`idTecnico`),
  CONSTRAINT `ordensservico_ibfk_1` FOREIGN KEY (`idCliente`) REFERENCES `usuarios` (`idUsuario`),
  CONSTRAINT `ordensservico_ibfk_2` FOREIGN KEY (`idEquipamento`) REFERENCES `equipamentos` (`idEquipamento`),
  CONSTRAINT `ordensservico_ibfk_3` FOREIGN KEY (`idTipoServico`) REFERENCES `tiposservico` (`idTipoServico`),
  CONSTRAINT `ordensservico_ibfk_4` FOREIGN KEY (`idTecnico`) REFERENCES `usuarios` (`idUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tiposservico`
--

DROP TABLE IF EXISTS `tiposservico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiposservico` (
  `idTipoServico` int NOT NULL AUTO_INCREMENT,
  `nomeServico` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idTipoServico`),
  UNIQUE KEY `nomeServico` (`nomeServico`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `idUsuario` int NOT NULL AUTO_INCREMENT,
  `nomeCompleto` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cpf` char(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `endereco` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senha` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `perfil` enum('administrador','tecnico','cliente') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `tentativasLogin` int NOT NULL DEFAULT '0',
  `bloqueadoAte` datetime DEFAULT NULL,
  `dataCadastro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUsuario`),
  UNIQUE KEY `cpf` (`cpf`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-06 11:32:16
