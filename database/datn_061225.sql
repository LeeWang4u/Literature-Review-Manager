-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: literature_review_db
-- ------------------------------------------------------
-- Server version	8.0.43

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
-- Table structure for table `ai_summaries`
--

DROP TABLE IF EXISTS `ai_summaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_summaries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `summary` text NOT NULL,
  `key_findings` json DEFAULT NULL,
  `methodology` text,
  `limitations` text,
  `generated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_2036692563883954f0e322991e` (`paper_id`),
  CONSTRAINT `FK_2036692563883954f0e322991ed` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `citations`
--

DROP TABLE IF EXISTS `citations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `citations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `citing_paper_id` int NOT NULL,
  `cited_paper_id` int NOT NULL,
  `citation_context` text,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `weight` float DEFAULT '0',
  `relevance_score` decimal(3,2) DEFAULT NULL COMMENT 'Relevance score (0-1) indicating how related this reference is',
  `is_influential` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Whether this is marked as an influential/key reference',
  `citation_depth` int NOT NULL DEFAULT '0',
  `parsed_authors` text,
  `parsed_title` text,
  `parsed_year` int DEFAULT NULL,
  `parsing_confidence` decimal(3,2) DEFAULT NULL,
  `raw_citation` text,
  `note_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a235a1c3c89d3b2be5a40cd419` (`citing_paper_id`,`cited_paper_id`),
  KEY `IDX_868a38a39584b6022353f182f7` (`citing_paper_id`),
  KEY `IDX_58fdfa9d1c9f8f17c030111dd2` (`cited_paper_id`),
  KEY `idx_citation_depth` (`citation_depth`),
  KEY `idx_citation_note` (`note_id`),
  CONSTRAINT `FK_58fdfa9d1c9f8f17c030111dd2f` FOREIGN KEY (`cited_paper_id`) REFERENCES `papers` (`id`),
  CONSTRAINT `FK_868a38a39584b6022353f182f78` FOREIGN KEY (`citing_paper_id`) REFERENCES `papers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1455 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `content` text NOT NULL,
  `highlight_text` text,
  `page_number` int DEFAULT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#FBBF24',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `title` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_58ae99c11416e89c6ca52a0532` (`paper_id`),
  KEY `IDX_3858ee67f8ad94f3e6df98577b` (`paper_id`),
  CONSTRAINT `FK_58ae99c11416e89c6ca52a05328` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=167 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `paper_tags`
--

DROP TABLE IF EXISTS `paper_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paper_tags` (
  `paper_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`paper_id`,`tag_id`),
  KEY `IDX_9c1e8211b828e576d6f6032e58` (`paper_id`),
  KEY `IDX_4c3aa56acb56a3bef988fbfae7` (`tag_id`),
  CONSTRAINT `FK_4c3aa56acb56a3bef988fbfae70` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_9c1e8211b828e576d6f6032e588` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `papers`
--

DROP TABLE IF EXISTS `papers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `papers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `authors` text NOT NULL,
  `abstract` text,
  `publication_year` int DEFAULT NULL,
  `journal` varchar(255) DEFAULT NULL,
  `volume` varchar(50) DEFAULT NULL,
  `issue` varchar(50) DEFAULT NULL,
  `pages` varchar(50) DEFAULT NULL,
  `doi` varchar(255) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `keywords` text,
  `status` enum('to_read','reading','completed') DEFAULT 'to_read',
  `favorite` tinyint(1) DEFAULT '0',
  `added_by` int NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `fullText` longtext COMMENT 'Extracted text from PDF files',
  `is_reference` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `IDX_4a17e3a78c30aaf2e81ef5da20` (`added_by`),
  KEY `idx_year` (`publication_year`),
  KEY `idx_title` (`title`),
  FULLTEXT KEY `IDX_627e649668573c688813fe22d4` (`title`,`abstract`,`keywords`),
  CONSTRAINT `FK_4a17e3a78c30aaf2e81ef5da20a` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1563 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pdf_files`
--

DROP TABLE IF EXISTS `pdf_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pdf_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paper_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `original_filename` varchar(255) NOT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `version` int NOT NULL DEFAULT '1',
  `uploaded_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ec873469f777cc539ed2e33fe2` (`paper_id`),
  CONSTRAINT `FK_ec873469f777cc539ed2e33fe2b` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#3B82F6',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `owner` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_d90243459a697eadb8ad56e909` (`name`),
  KEY `fk_tags_owner` (`owner`),
  CONSTRAINT `fk_tags_owner` FOREIGN KEY (`owner`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_library`
--

DROP TABLE IF EXISTS `user_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_library` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `paper_id` int NOT NULL,
  `status` enum('to-read','reading','read','favorite') NOT NULL DEFAULT 'to-read',
  `rating` int DEFAULT NULL,
  `added_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_4ff7fa478b629b47ad1d37439c` (`user_id`,`paper_id`),
  KEY `IDX_9e07adf1440a58371e1eb00c05` (`user_id`),
  KEY `IDX_99e86f3e33c3d4259dd019a8d6` (`paper_id`),
  KEY `IDX_178abe1eef58f92dca6001d8a2` (`status`),
  CONSTRAINT `FK_99e86f3e33c3d4259dd019a8d6b` FOREIGN KEY (`paper_id`) REFERENCES `papers` (`id`),
  CONSTRAINT `FK_9e07adf1440a58371e1eb00c05f` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `bio` text,
  `affiliation` varchar(255) DEFAULT NULL,
  `research_interests` text,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `last_login` timestamp NULL DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT '1',
  `google_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
  KEY `idx_google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-06 14:48:25
