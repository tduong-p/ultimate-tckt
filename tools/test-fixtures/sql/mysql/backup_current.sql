-- MySQL dump 10.13  Distrib 8.4.11, for Linux (aarch64)
--
-- Host: localhost    Database: tckt_activity_hub
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(180) NOT NULL,
  `description` text NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `public_image_url` varchar(1000) DEFAULT NULL,
  `proposal_document_url` varchar(1000) DEFAULT NULL,
  `type` enum('event','assigned') NOT NULL,
  `status` enum('proposed','changes_requested','approved','active','completed','cancelled') NOT NULL DEFAULT 'proposed',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `team_id` int unsigned NOT NULL,
  `creator_id` int unsigned NOT NULL,
  `event_lead_id` int unsigned DEFAULT NULL,
  `requested_by` varchar(160) DEFAULT NULL,
  `location` varchar(180) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `deadline` date NOT NULL,
  `result_summary` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activities_public` (`is_public`,`created_at`),
  KEY `team_id` (`team_id`),
  KEY `creator_id` (`creator_id`),
  FULLTEXT KEY `activity_search` (`title`,`description`,`result_summary`),
  CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `activities_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activities`
--

LOCK TABLES `activities` WRITE;
/*!40000 ALTER TABLE `activities` DISABLE KEYS */;
INSERT INTO `activities` VALUES (2,'Hồ sơ khen thưởng TW Đoàn','Hoàn thành hồ sơ, rà soát khen thưởng TW Đoàn cho các đồng chí',0,NULL,NULL,'assigned','approved','urgent',4,31,NULL,'Thường vụ Đoàn Đại học',NULL,'2026-09-18','2026-09-20',NULL,'2026-09-18 16:56:28','2026-09-18 17:02:08'),(4,'Tham gia tuyển thành viên Ban TCKT','Tham gia tuyển thành viên Ban TCKT',0,NULL,NULL,'assigned','active','high',6,3,29,NULL,NULL,'2026-09-19','2026-09-19',NULL,'2026-09-18 17:46:08','2026-09-19 16:04:09'),(5,'Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn','Tổng hợp lại danh sách đề nghị khen thưởng, danh sách khen thưởng file Excel phối hợp Việt Bách rà soát kiểm tra lại điểm của các sinh viên để báo cáo Ban TV',0,NULL,NULL,'event','proposed','high',4,31,31,NULL,NULL,'2026-09-21','2026-09-26',NULL,'2026-09-21 18:09:12','2026-09-21 18:09:12');
/*!40000 ALTER TABLE `activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_proposals`
--

DROP TABLE IF EXISTS `activity_proposals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_proposals` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `activity_id` int unsigned NOT NULL,
  `submitted_by` int unsigned NOT NULL,
  `action` enum('submit','approve','reject','request_changes') NOT NULL,
  `reviewer_id` int unsigned DEFAULT NULL,
  `feedback_notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activity_id` (`activity_id`),
  KEY `submitted_by` (`submitted_by`),
  KEY `reviewer_id` (`reviewer_id`),
  CONSTRAINT `activity_proposals_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activity_proposals_ibfk_2` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`),
  CONSTRAINT `activity_proposals_ibfk_3` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_proposals`
--

LOCK TABLES `activity_proposals` WRITE;
/*!40000 ALTER TABLE `activity_proposals` DISABLE KEYS */;
INSERT INTO `activity_proposals` VALUES (1,2,31,'approve',31,NULL,'2026-09-18 17:02:08'),(3,4,3,'approve',3,NULL,'2026-09-18 17:46:11');
/*!40000 ALTER TABLE `activity_proposals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_teams`
--

DROP TABLE IF EXISTS `activity_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_teams` (
  `activity_id` int unsigned NOT NULL,
  `team_id` int unsigned NOT NULL,
  `role` enum('primary','supporting') NOT NULL DEFAULT 'supporting',
  `responsibility` varchar(255) DEFAULT NULL,
  `contact_user_id` int unsigned DEFAULT NULL,
  PRIMARY KEY (`activity_id`,`team_id`),
  KEY `team_id` (`team_id`),
  KEY `contact_user_id` (`contact_user_id`),
  CONSTRAINT `activity_teams_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activity_teams_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `activity_teams_ibfk_3` FOREIGN KEY (`contact_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_teams`
--

LOCK TABLES `activity_teams` WRITE;
/*!40000 ALTER TABLE `activity_teams` DISABLE KEYS */;
INSERT INTO `activity_teams` VALUES (2,4,'primary','Coordinates the activity',NULL),(2,6,'supporting','Supports the activity',NULL),(4,2,'supporting','Supports the activity',NULL),(4,3,'supporting','Supports the activity',NULL),(4,4,'supporting','Supports the activity',NULL),(4,5,'supporting','Supports the activity',NULL),(4,6,'primary','Coordinates the activity',NULL),(5,3,'supporting','Supports the activity',NULL),(5,4,'primary','Coordinates the activity',NULL),(5,6,'supporting','Supports the activity',NULL);
/*!40000 ALTER TABLE `activity_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `link_url` varchar(1000) NOT NULL,
  `description` text NOT NULL,
  `applicable_year` smallint unsigned NOT NULL,
  `issuing_team_id` int unsigned NOT NULL,
  `visibility` enum('all_teams','issuing_team') NOT NULL DEFAULT 'issuing_team',
  `created_by` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `documents_year` (`applicable_year`),
  KEY `documents_team` (`issuing_team_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`issuing_team_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `activity_id` int unsigned DEFAULT NULL,
  `task_id` int unsigned DEFAULT NULL,
  `kind` varchar(50) NOT NULL,
  `title` varchar(180) NOT NULL,
  `body` varchar(500) NOT NULL,
  `url` varchar(500) DEFAULT NULL,
  `source_key` varchar(190) NOT NULL,
  `email_status` enum('pending','success','failed') DEFAULT NULL,
  `push_status` enum('pending','success','failed') DEFAULT NULL,
  `seen_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notifications_user_source` (`user_id`,`source_key`),
  KEY `notifications_inbox` (`user_id`,`seen_at`,`created_at`),
  KEY `notifications_expiry` (`expires_at`),
  KEY `notifications_activity` (`activity_id`),
  KEY `notifications_task` (`task_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notifications_ibfk_3` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5644 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (136,2,4,4,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Việt Bách đã tự log việc: “Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV” (Điểm: 5).','/#activity/4','task-self-log:4:2',NULL,NULL,NULL,'2026-09-26 02:14:49','2026-09-19 02:14:49'),(137,48,4,4,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Việt Bách đã tự log việc: “Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV” (Điểm: 5).','/#activity/4','task-self-log:4:48',NULL,NULL,'2026-09-19 16:11:22','2026-09-26 02:14:49','2026-09-19 02:14:49'),(138,49,4,4,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Việt Bách đã tự log việc: “Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV” (Điểm: 5).','/#activity/4','task-self-log:4:49',NULL,NULL,NULL,'2026-09-26 02:14:49','2026-09-19 02:14:49'),(139,52,4,4,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Việt Bách đã tự log việc: “Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV” (Điểm: 5).','/#activity/4','task-self-log:4:52',NULL,NULL,NULL,'2026-09-26 02:14:49','2026-09-19 02:14:49'),(140,48,4,4,'task_overdue','Công việc trễ hạn','\"Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:4:48:2026-09-19',NULL,NULL,'2026-09-19 16:11:22','2026-09-26 02:24:36','2026-09-19 02:24:36'),(191,5,4,10,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Quỳnh Ngọc đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:10:5',NULL,NULL,NULL,'2026-09-26 05:34:38','2026-09-19 05:34:38'),(192,6,4,10,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Quỳnh Ngọc đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:10:6',NULL,NULL,NULL,'2026-09-26 05:34:38','2026-09-19 05:34:38'),(193,16,4,10,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Quỳnh Ngọc đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:10:16',NULL,NULL,'2026-09-19 10:57:56','2026-09-26 05:34:38','2026-09-19 05:34:38'),(194,33,4,11,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:11:33',NULL,NULL,NULL,'2026-09-26 05:35:44','2026-09-19 05:35:44'),(195,34,4,11,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:11:34',NULL,NULL,NULL,'2026-09-26 05:35:44','2026-09-19 05:35:44'),(196,10,4,10,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:10:10:2026-09-19',NULL,NULL,NULL,'2026-09-26 05:46:54','2026-09-19 05:46:54'),(197,37,4,11,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:11:37:2026-09-19',NULL,NULL,'2026-09-19 08:01:01','2026-09-26 05:46:54','2026-09-19 05:46:54'),(212,33,4,12,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Đức Thái Tùng đã tự log việc: “3 — Trọng trách / Đột xuất” (Điểm: 3).','/#activity/4','task-self-log:12:33',NULL,NULL,NULL,'2026-09-26 07:35:09','2026-09-19 07:35:09'),(213,34,4,12,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Đức Thái Tùng đã tự log việc: “3 — Trọng trách / Đột xuất” (Điểm: 3).','/#activity/4','task-self-log:12:34',NULL,NULL,NULL,'2026-09-26 07:35:09','2026-09-19 07:35:09'),(216,39,4,12,'task_overdue','Công việc trễ hạn','\"3 — Trọng trách / Đột xuất\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:12:39:2026-09-19',NULL,NULL,NULL,'2026-09-26 07:46:54','2026-09-19 07:46:54'),(217,2,4,13,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Trần Minh Trí đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:13:2',NULL,NULL,NULL,'2026-09-26 07:53:59','2026-09-19 07:53:59'),(218,48,4,13,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Trần Minh Trí đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:13:48',NULL,NULL,'2026-09-19 16:11:22','2026-09-26 07:53:59','2026-09-19 07:53:59'),(219,49,4,13,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Trần Minh Trí đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:13:49',NULL,NULL,NULL,'2026-09-26 07:53:59','2026-09-19 07:53:59'),(220,52,4,13,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Trần Minh Trí đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:13:52',NULL,NULL,NULL,'2026-09-26 07:53:59','2026-09-19 07:53:59'),(224,56,4,13,'task_overdue','Công việc trễ hạn','\"Checkin\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:13:56:2026-09-19',NULL,NULL,NULL,'2026-09-26 08:01:54','2026-09-19 08:01:54'),(225,33,4,14,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:14:33',NULL,NULL,NULL,'2026-09-26 08:03:58','2026-09-19 08:03:58'),(226,34,4,14,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:14:34',NULL,NULL,NULL,'2026-09-26 08:03:58','2026-09-19 08:03:58'),(227,33,4,15,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:15:33',NULL,NULL,NULL,'2026-09-26 08:05:23','2026-09-19 08:05:23'),(228,34,4,15,'task_review','Nghiệm thu công việc tự ghi nhận','Dư Thị Khánh Hoà đã tự log việc: “Phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:15:34',NULL,NULL,NULL,'2026-09-26 08:05:23','2026-09-19 08:05:23'),(233,37,4,15,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:15:37:2026-09-19',NULL,NULL,NULL,'2026-09-26 08:16:54','2026-09-19 08:16:54'),(324,33,4,16,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Đức Thái Tùng đã tự log việc: “Check in” (Điểm: 3).','/#activity/4','task-self-log:16:33',NULL,NULL,NULL,'2026-09-26 12:45:38','2026-09-19 12:45:38'),(325,34,4,16,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Đức Thái Tùng đã tự log việc: “Check in” (Điểm: 3).','/#activity/4','task-self-log:16:34',NULL,NULL,NULL,'2026-09-26 12:45:38','2026-09-19 12:45:38'),(330,39,4,16,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:16:39:2026-09-19',NULL,NULL,NULL,'2026-09-26 12:51:02','2026-09-19 12:51:02'),(391,5,4,17,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Thu Hằng đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:17:5',NULL,NULL,NULL,'2026-09-26 16:00:11','2026-09-19 16:00:11'),(392,6,4,17,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Thu Hằng đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:17:6',NULL,NULL,NULL,'2026-09-26 16:00:11','2026-09-19 16:00:11'),(393,16,4,17,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Thu Hằng đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:17:16',NULL,NULL,NULL,'2026-09-26 16:00:11','2026-09-19 16:00:11'),(399,16,4,17,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:17:16:2026-09-19',NULL,NULL,NULL,'2026-09-26 16:06:02','2026-09-19 16:06:02'),(421,10,4,10,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:10:10:2026-09-20',NULL,NULL,NULL,'2026-09-26 17:07:15','2026-09-19 17:07:15'),(422,37,4,11,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:11:37:2026-09-20',NULL,NULL,NULL,'2026-09-26 17:07:15','2026-09-19 17:07:15'),(423,37,4,15,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:15:37:2026-09-20',NULL,NULL,NULL,'2026-09-26 17:07:15','2026-09-19 17:07:15'),(424,39,4,16,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:16:39:2026-09-20',NULL,NULL,NULL,'2026-09-26 17:07:15','2026-09-19 17:07:15'),(425,16,4,17,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:17:16:2026-09-20',NULL,NULL,NULL,'2026-09-26 17:07:15','2026-09-19 17:07:15'),(806,2,4,18,'task_review','Nghiệm thu công việc tự ghi nhận','Đào Khánh Huyền đã tự log việc: “Check in” (Điểm: 2).','/#activity/4','task-self-log:18:2',NULL,NULL,NULL,'2026-09-27 12:01:53','2026-09-20 12:01:53'),(807,48,4,18,'task_review','Nghiệm thu công việc tự ghi nhận','Đào Khánh Huyền đã tự log việc: “Check in” (Điểm: 2).','/#activity/4','task-self-log:18:48',NULL,NULL,NULL,'2026-09-27 12:01:53','2026-09-20 12:01:53'),(808,49,4,18,'task_review','Nghiệm thu công việc tự ghi nhận','Đào Khánh Huyền đã tự log việc: “Check in” (Điểm: 2).','/#activity/4','task-self-log:18:49',NULL,NULL,NULL,'2026-09-27 12:01:53','2026-09-20 12:01:53'),(809,52,4,18,'task_review','Nghiệm thu công việc tự ghi nhận','Đào Khánh Huyền đã tự log việc: “Check in” (Điểm: 2).','/#activity/4','task-self-log:18:52',NULL,NULL,NULL,'2026-09-27 12:01:53','2026-09-20 12:01:53'),(815,58,4,18,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:18:58:2026-09-20',NULL,NULL,NULL,'2026-09-27 12:08:30','2026-09-20 12:08:30'),(822,5,4,19,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Trực bàn tuyển thành viên” (Điểm: 1).','/#activity/4','task-self-log:19:5',NULL,NULL,NULL,'2026-09-27 12:29:07','2026-09-20 12:29:07'),(823,6,4,19,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Trực bàn tuyển thành viên” (Điểm: 1).','/#activity/4','task-self-log:19:6',NULL,NULL,NULL,'2026-09-27 12:29:07','2026-09-20 12:29:07'),(824,16,4,19,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Trực bàn tuyển thành viên” (Điểm: 1).','/#activity/4','task-self-log:19:16',NULL,NULL,NULL,'2026-09-27 12:29:07','2026-09-20 12:29:07'),(825,5,4,20,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:20:5',NULL,NULL,NULL,'2026-09-27 12:37:07','2026-09-20 12:37:07'),(826,6,4,20,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:20:6',NULL,NULL,NULL,'2026-09-27 12:37:07','2026-09-20 12:37:07'),(827,16,4,20,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:20:16',NULL,NULL,NULL,'2026-09-27 12:37:07','2026-09-20 12:37:07'),(834,23,4,19,'task_overdue','Công việc trễ hạn','\"Trực bàn tuyển thành viên\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:19:23:2026-09-20',NULL,NULL,'2026-09-22 05:31:39','2026-09-27 12:38:30','2026-09-20 12:38:30'),(835,23,4,20,'task_overdue','Công việc trễ hạn','\"Tham gia phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:20:23:2026-09-20',NULL,NULL,'2026-09-22 05:31:39','2026-09-27 12:38:30','2026-09-20 12:38:30'),(924,5,4,21,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:21:5',NULL,NULL,NULL,'2026-09-27 15:37:25','2026-09-20 15:37:25'),(925,6,4,21,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:21:6',NULL,NULL,NULL,'2026-09-27 15:37:25','2026-09-20 15:37:25'),(926,16,4,21,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:21:16',NULL,NULL,NULL,'2026-09-27 15:37:25','2026-09-20 15:37:25'),(935,5,4,22,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:22:5',NULL,NULL,NULL,'2026-09-27 15:39:42','2026-09-20 15:39:42'),(936,6,4,22,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:22:6',NULL,NULL,NULL,'2026-09-27 15:39:42','2026-09-20 15:39:42'),(937,16,4,22,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Hải Long đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:22:16',NULL,NULL,NULL,'2026-09-27 15:39:42','2026-09-20 15:39:42'),(938,9,4,22,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:22:9:2026-09-20',NULL,NULL,NULL,'2026-09-27 15:53:30','2026-09-20 15:53:30'),(983,2,4,23,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:23:2',NULL,NULL,NULL,'2026-09-27 16:59:31','2026-09-20 16:59:31'),(984,48,4,23,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:23:48',NULL,NULL,NULL,'2026-09-27 16:59:31','2026-09-20 16:59:31'),(985,49,4,23,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:23:49',NULL,NULL,NULL,'2026-09-27 16:59:31','2026-09-20 16:59:31'),(986,52,4,23,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:23:52',NULL,NULL,NULL,'2026-09-27 16:59:31','2026-09-20 16:59:31'),(987,2,4,24,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Checkin” (Điểm: 1).','/#activity/4','task-self-log:24:2',NULL,NULL,NULL,'2026-09-27 17:01:16','2026-09-20 17:01:16'),(988,48,4,24,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Checkin” (Điểm: 1).','/#activity/4','task-self-log:24:48',NULL,NULL,NULL,'2026-09-27 17:01:16','2026-09-20 17:01:16'),(989,49,4,24,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Checkin” (Điểm: 1).','/#activity/4','task-self-log:24:49',NULL,NULL,NULL,'2026-09-27 17:01:16','2026-09-20 17:01:16'),(990,52,4,24,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Đình Quảng Đức đã tự log việc: “Checkin” (Điểm: 1).','/#activity/4','task-self-log:24:52',NULL,NULL,NULL,'2026-09-27 17:01:16','2026-09-20 17:01:16'),(991,57,4,24,'task_overdue','Công việc trễ hạn','\"Checkin\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:24:57:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(992,57,4,23,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:23:57:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(993,9,4,22,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:22:9:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(994,23,4,20,'task_overdue','Công việc trễ hạn','\"Tham gia phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:20:23:2026-09-21',NULL,NULL,'2026-09-22 05:31:39','2026-09-27 17:08:30','2026-09-20 17:08:30'),(995,23,4,19,'task_overdue','Công việc trễ hạn','\"Trực bàn tuyển thành viên\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:19:23:2026-09-21',NULL,NULL,'2026-09-22 05:31:39','2026-09-27 17:08:30','2026-09-20 17:08:30'),(996,58,4,18,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:18:58:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(997,16,4,17,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:17:16:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(998,39,4,16,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:16:39:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(999,37,4,15,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:15:37:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(1000,37,4,11,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:11:37:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(1001,10,4,10,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:10:10:2026-09-21',NULL,NULL,NULL,'2026-09-27 17:08:30','2026-09-20 17:08:30'),(1024,33,4,25,'task_review','Nghiệm thu công việc tự ghi nhận','Lâm Đức Mạnh đã tự log việc: “Check in” (Điểm: 1).','/#activity/4','task-self-log:25:33',NULL,NULL,NULL,'2026-09-27 17:51:26','2026-09-20 17:51:26'),(1025,34,4,25,'task_review','Nghiệm thu công việc tự ghi nhận','Lâm Đức Mạnh đã tự log việc: “Check in” (Điểm: 1).','/#activity/4','task-self-log:25:34',NULL,NULL,NULL,'2026-09-27 17:51:26','2026-09-20 17:51:26'),(1026,44,4,25,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:25:44:2026-09-21',NULL,NULL,'2026-09-20 17:53:55','2026-09-27 17:53:30','2026-09-20 17:53:30'),(1590,5,4,26,'task_review','Nghiệm thu công việc tự ghi nhận','Vương Nam Phương đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:26:5',NULL,NULL,NULL,'2026-09-28 05:32:21','2026-09-21 05:32:21'),(1591,6,4,26,'task_review','Nghiệm thu công việc tự ghi nhận','Vương Nam Phương đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:26:6',NULL,NULL,NULL,'2026-09-28 05:32:21','2026-09-21 05:32:21'),(1592,16,4,26,'task_review','Nghiệm thu công việc tự ghi nhận','Vương Nam Phương đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:26:16',NULL,NULL,NULL,'2026-09-28 05:32:21','2026-09-21 05:32:21'),(1593,12,4,26,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:26:12:2026-09-21',NULL,NULL,NULL,'2026-09-28 05:38:31','2026-09-21 05:38:31'),(1606,2,4,27,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Văn Minh đã tự log việc: “Phỏng vấn” (Điểm: 5).','/#activity/4','task-self-log:27:2',NULL,NULL,NULL,'2026-09-28 05:42:51','2026-09-21 05:42:51'),(1607,48,4,27,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Văn Minh đã tự log việc: “Phỏng vấn” (Điểm: 5).','/#activity/4','task-self-log:27:48',NULL,NULL,NULL,'2026-09-28 05:42:51','2026-09-21 05:42:51'),(1608,49,4,27,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Văn Minh đã tự log việc: “Phỏng vấn” (Điểm: 5).','/#activity/4','task-self-log:27:49',NULL,NULL,NULL,'2026-09-28 05:42:51','2026-09-21 05:42:51'),(1609,52,4,27,'task_review','Nghiệm thu công việc tự ghi nhận','Phạm Văn Minh đã tự log việc: “Phỏng vấn” (Điểm: 5).','/#activity/4','task-self-log:27:52',NULL,NULL,NULL,'2026-09-28 05:42:51','2026-09-21 05:42:51'),(1610,33,4,28,'task_review','Nghiệm thu công việc tự ghi nhận','Trần Thị Ngọc Tân đã tự log việc: “1 — Tiêu chuẩn / Lặp lại” (Điểm: 1).','/#activity/4','task-self-log:28:33',NULL,NULL,NULL,'2026-09-28 05:48:23','2026-09-21 05:48:23'),(1611,34,4,28,'task_review','Nghiệm thu công việc tự ghi nhận','Trần Thị Ngọc Tân đã tự log việc: “1 — Tiêu chuẩn / Lặp lại” (Điểm: 1).','/#activity/4','task-self-log:28:34',NULL,NULL,NULL,'2026-09-28 05:48:23','2026-09-21 05:48:23'),(1612,42,4,28,'task_overdue','Công việc trễ hạn','\"1 — Tiêu chuẩn / Lặp lại\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:28:42:2026-09-21',NULL,NULL,NULL,'2026-09-28 05:53:31','2026-09-21 05:53:31'),(1613,51,4,27,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:27:51:2026-09-21',NULL,NULL,NULL,'2026-09-28 05:53:31','2026-09-21 05:53:31'),(1657,5,4,29,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Công Nam đã tự log việc: “Hỗ trợ PV (ghi chép thông tin)” (Điểm: 6).','/#activity/4','task-self-log:29:5',NULL,NULL,NULL,'2026-09-28 06:31:24','2026-09-21 06:31:24'),(1658,6,4,29,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Công Nam đã tự log việc: “Hỗ trợ PV (ghi chép thông tin)” (Điểm: 6).','/#activity/4','task-self-log:29:6',NULL,NULL,NULL,'2026-09-28 06:31:24','2026-09-21 06:31:24'),(1659,16,4,29,'task_review','Nghiệm thu công việc tự ghi nhận','Ngô Công Nam đã tự log việc: “Hỗ trợ PV (ghi chép thông tin)” (Điểm: 6).','/#activity/4','task-self-log:29:16',NULL,NULL,NULL,'2026-09-28 06:31:24','2026-09-21 06:31:24'),(1660,2,4,30,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Văn Gia Huy đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:30:2',NULL,NULL,NULL,'2026-09-28 06:38:30','2026-09-21 06:38:30'),(1661,48,4,30,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Văn Gia Huy đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:30:48',NULL,NULL,NULL,'2026-09-28 06:38:30','2026-09-21 06:38:30'),(1662,49,4,30,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Văn Gia Huy đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:30:49',NULL,NULL,NULL,'2026-09-28 06:38:30','2026-09-21 06:38:30'),(1663,52,4,30,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Văn Gia Huy đã tự log việc: “Phỏng vấn” (Điểm: 6).','/#activity/4','task-self-log:30:52',NULL,NULL,NULL,'2026-09-28 06:38:30','2026-09-21 06:38:30'),(1664,52,4,30,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:30:52:2026-09-21',NULL,NULL,NULL,'2026-09-28 06:38:31','2026-09-21 06:38:31'),(1665,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-21',NULL,NULL,'2026-09-21 06:39:34','2026-09-28 06:38:31','2026-09-21 06:38:31'),(1777,33,4,31,'task_review','Nghiệm thu công việc tự ghi nhận','Đặng Lê Quang Minh đã tự log việc: “0 — Tham gia / Hỗ trợ nhẹ” (Điểm: 0).','/#activity/4','task-self-log:31:33',NULL,NULL,NULL,'2026-09-28 08:50:32','2026-09-21 08:50:32'),(1778,34,4,31,'task_review','Nghiệm thu công việc tự ghi nhận','Đặng Lê Quang Minh đã tự log việc: “0 — Tham gia / Hỗ trợ nhẹ” (Điểm: 0).','/#activity/4','task-self-log:31:34',NULL,NULL,NULL,'2026-09-28 08:50:32','2026-09-21 08:50:32'),(1779,40,4,31,'task_overdue','Công việc trễ hạn','\"0 — Tham gia / Hỗ trợ nhẹ\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:31:40:2026-09-21',NULL,NULL,NULL,'2026-09-28 08:53:31','2026-09-21 08:53:31'),(1805,5,4,32,'task_review','Nghiệm thu công việc tự ghi nhận','Trần Hoàng Linh đã tự log việc: “Check-in” (Điểm: 3).','/#activity/4','task-self-log:32:5',NULL,NULL,NULL,'2026-09-28 09:16:55','2026-09-21 09:16:55'),(1806,6,4,32,'task_review','Nghiệm thu công việc tự ghi nhận','Trần Hoàng Linh đã tự log việc: “Check-in” (Điểm: 3).','/#activity/4','task-self-log:32:6',NULL,NULL,NULL,'2026-09-28 09:16:55','2026-09-21 09:16:55'),(1807,16,4,32,'task_review','Nghiệm thu công việc tự ghi nhận','Trần Hoàng Linh đã tự log việc: “Check-in” (Điểm: 3).','/#activity/4','task-self-log:32:16',NULL,NULL,NULL,'2026-09-28 09:16:55','2026-09-21 09:16:55'),(1808,26,4,32,'task_overdue','Công việc trễ hạn','\"Check-in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:32:26:2026-09-21',NULL,NULL,'2026-09-21 09:33:18','2026-09-28 09:23:31','2026-09-21 09:23:31'),(1892,23,4,20,'task_response','New task response','Trần Đức Hoàng Anh responded to “Tham gia phỏng vấn”.','/#activity/4','task-response:52:23','failed','failed','2026-09-22 05:31:39','2026-09-28 10:44:18','2026-09-21 10:44:18'),(1992,5,4,33,'task_review','Nghiệm thu công việc tự ghi nhận','Lê Trọng Nhân đã tự log việc: “Phỏng vấn” (Điểm: 9).','/#activity/4','task-self-log:33:5',NULL,NULL,NULL,'2026-09-28 13:24:00','2026-09-21 13:24:00'),(1993,6,4,33,'task_review','Nghiệm thu công việc tự ghi nhận','Lê Trọng Nhân đã tự log việc: “Phỏng vấn” (Điểm: 9).','/#activity/4','task-self-log:33:6',NULL,NULL,NULL,'2026-09-28 13:24:00','2026-09-21 13:24:00'),(1994,16,4,33,'task_review','Nghiệm thu công việc tự ghi nhận','Lê Trọng Nhân đã tự log việc: “Phỏng vấn” (Điểm: 9).','/#activity/4','task-self-log:33:16',NULL,NULL,NULL,'2026-09-28 13:24:00','2026-09-21 13:24:00'),(1995,15,4,33,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:33:15:2026-09-21',NULL,NULL,NULL,'2026-09-28 13:38:31','2026-09-21 13:38:31'),(2025,5,4,34,'task_review','Nghiệm thu công việc tự ghi nhận','Thái Huy Vũ Quang đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:34:5',NULL,NULL,NULL,'2026-09-28 14:08:41','2026-09-21 14:08:41'),(2026,6,4,34,'task_review','Nghiệm thu công việc tự ghi nhận','Thái Huy Vũ Quang đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:34:6',NULL,NULL,NULL,'2026-09-28 14:08:41','2026-09-21 14:08:41'),(2027,16,4,34,'task_review','Nghiệm thu công việc tự ghi nhận','Thái Huy Vũ Quang đã tự log việc: “Checkin” (Điểm: 2).','/#activity/4','task-self-log:34:16',NULL,NULL,NULL,'2026-09-28 14:08:41','2026-09-21 14:08:41'),(2028,14,4,34,'task_overdue','Công việc trễ hạn','\"Checkin\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:34:14:2026-09-21',NULL,NULL,NULL,'2026-09-28 14:23:31','2026-09-21 14:23:31'),(2105,5,4,35,'task_review','Nghiệm thu công việc tự ghi nhận','Đặng Thị Trà My đã tự log việc: “Phỏng vấn tuyển thành viên” (Điểm: 6).','/#activity/4','task-self-log:35:5',NULL,NULL,NULL,'2026-09-28 16:01:09','2026-09-21 16:01:09'),(2106,6,4,35,'task_review','Nghiệm thu công việc tự ghi nhận','Đặng Thị Trà My đã tự log việc: “Phỏng vấn tuyển thành viên” (Điểm: 6).','/#activity/4','task-self-log:35:6',NULL,NULL,NULL,'2026-09-28 16:01:09','2026-09-21 16:01:09'),(2107,16,4,35,'task_review','Nghiệm thu công việc tự ghi nhận','Đặng Thị Trà My đã tự log việc: “Phỏng vấn tuyển thành viên” (Điểm: 6).','/#activity/4','task-self-log:35:16',NULL,NULL,NULL,'2026-09-28 16:01:09','2026-09-21 16:01:09'),(2108,11,4,35,'task_overdue','Công việc trễ hạn','\"Phỏng vấn tuyển thành viên\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:35:11:2026-09-21',NULL,NULL,NULL,'2026-09-28 16:08:31','2026-09-21 16:08:31'),(2156,11,4,35,'task_overdue','Công việc trễ hạn','\"Phỏng vấn tuyển thành viên\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:35:11:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2157,14,4,34,'task_overdue','Công việc trễ hạn','\"Checkin\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:34:14:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2158,15,4,33,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:33:15:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2159,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2160,42,4,28,'task_overdue','Công việc trễ hạn','\"1 — Tiêu chuẩn / Lặp lại\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:28:42:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2161,12,4,26,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:26:12:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2162,44,4,25,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:25:44:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2163,9,4,22,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:22:9:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2164,23,4,19,'task_overdue','Công việc trễ hạn','\"Trực bàn tuyển thành viên\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:19:23:2026-09-22',NULL,NULL,'2026-09-22 05:31:39','2026-09-28 17:08:31','2026-09-21 17:08:31'),(2165,16,4,17,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:17:16:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2166,39,4,16,'task_overdue','Công việc trễ hạn','\"Check in\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:16:39:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2167,37,4,15,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:15:37:2026-09-22',NULL,NULL,NULL,'2026-09-28 17:08:31','2026-09-21 17:08:31'),(2194,5,5,36,'task_assigned','Công việc mới','Bạn được giao: Tổng hợp danh sách khen thưởng Đoàn Đại học','/#activity/5','task-assigned:36:5',NULL,NULL,NULL,'2026-09-28 18:10:06','2026-09-21 18:10:06'),(2195,6,5,36,'task_assigned','Công việc mới','Bạn được giao: Tổng hợp danh sách khen thưởng Đoàn Đại học','/#activity/5','task-assigned:36:6',NULL,NULL,NULL,'2026-09-28 18:10:06','2026-09-21 18:10:06'),(2196,16,5,36,'task_assigned','Công việc mới','Bạn được giao: Tổng hợp danh sách khen thưởng Đoàn Đại học','/#activity/5','task-assigned:36:16',NULL,NULL,NULL,'2026-09-28 18:10:06','2026-09-21 18:10:06'),(2243,5,4,37,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:37:5',NULL,NULL,NULL,'2026-09-29 05:41:27','2026-09-22 05:41:27'),(2244,6,4,37,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:37:6',NULL,NULL,NULL,'2026-09-29 05:41:27','2026-09-22 05:41:27'),(2245,16,4,37,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn” (Điểm: 2).','/#activity/4','task-self-log:37:16',NULL,NULL,NULL,'2026-09-29 05:41:27','2026-09-22 05:41:27'),(2246,5,4,38,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Thu Hằng đã tự log việc: “phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:38:5',NULL,NULL,NULL,'2026-09-29 05:52:02','2026-09-22 05:52:02'),(2247,6,4,38,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Thu Hằng đã tự log việc: “phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:38:6',NULL,NULL,NULL,'2026-09-29 05:52:02','2026-09-22 05:52:02'),(2248,16,4,38,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Thu Hằng đã tự log việc: “phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:38:16',NULL,NULL,NULL,'2026-09-29 05:52:02','2026-09-22 05:52:02'),(2250,23,4,37,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:37:23:2026-09-22',NULL,NULL,'2026-09-22 06:12:40','2026-09-29 05:53:32','2026-09-22 05:53:32'),(2251,20,4,38,'task_overdue','Công việc trễ hạn','\"phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:38:20:2026-09-22',NULL,NULL,'2026-09-22 05:54:32','2026-09-29 05:53:32','2026-09-22 05:53:32'),(2255,5,4,39,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra” (Điểm: 2).','/#activity/4','task-self-log:39:5',NULL,NULL,NULL,'2026-09-29 06:11:15','2026-09-22 06:11:15'),(2256,6,4,39,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra” (Điểm: 2).','/#activity/4','task-self-log:39:6',NULL,NULL,NULL,'2026-09-29 06:11:15','2026-09-22 06:11:15'),(2257,16,4,39,'task_review','Nghiệm thu công việc tự ghi nhận','Tạ Quang Huy đã tự log việc: “Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra” (Điểm: 2).','/#activity/4','task-self-log:39:16',NULL,NULL,NULL,'2026-09-29 06:11:15','2026-09-22 06:11:15'),(2260,23,4,39,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:39:23:2026-09-22',NULL,NULL,NULL,'2026-09-29 06:23:32','2026-09-22 06:23:32'),(2387,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-23',NULL,NULL,NULL,'2026-09-29 17:08:32','2026-09-22 17:08:32'),(2388,20,4,38,'task_overdue','Công việc trễ hạn','\"phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:38:20:2026-09-23',NULL,NULL,NULL,'2026-09-29 17:08:32','2026-09-22 17:08:32'),(2389,23,4,39,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:39:23:2026-09-23',NULL,NULL,NULL,'2026-09-29 17:08:32','2026-09-22 17:08:32'),(2405,31,5,36,'task_unacknowledged','Thành viên chưa xác nhận nhận việc','Nguyễn Thanh An chưa xác nhận nhận việc \"Tổng hợp danh sách khen thưởng Đoàn Đại học\" sau 24 giờ.','/#activity/5','task-unacknowledged:36:5',NULL,NULL,NULL,'2026-09-29 18:23:33','2026-09-22 18:23:33'),(2406,31,5,36,'task_unacknowledged','Thành viên chưa xác nhận nhận việc','Đặng Thị Thùy Dương chưa xác nhận nhận việc \"Tổng hợp danh sách khen thưởng Đoàn Đại học\" sau 24 giờ.','/#activity/5','task-unacknowledged:36:6',NULL,NULL,NULL,'2026-09-29 18:23:33','2026-09-22 18:23:33'),(2407,31,5,36,'task_unacknowledged','Thành viên chưa xác nhận nhận việc','Ngô Thu Hằng chưa xác nhận nhận việc \"Tổng hợp danh sách khen thưởng Đoàn Đại học\" sau 24 giờ.','/#activity/5','task-unacknowledged:36:16',NULL,NULL,NULL,'2026-09-29 18:23:33','2026-09-22 18:23:33'),(2516,16,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:16:2026-09-23',NULL,NULL,NULL,'2026-09-29 23:08:33','2026-09-22 23:08:33'),(2517,6,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:6:2026-09-23',NULL,NULL,NULL,'2026-09-29 23:08:33','2026-09-22 23:08:33'),(2518,5,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:5:2026-09-23',NULL,NULL,NULL,'2026-09-29 23:08:33','2026-09-22 23:08:33'),(3146,62,4,40,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Như Gia Linh đã tự log việc: “Lễ tân” (Điểm: 3).','/#activity/4','task-self-log:40:62',NULL,NULL,NULL,'2026-09-30 16:31:19','2026-09-23 16:31:19'),(3153,63,4,40,'task_overdue','Công việc trễ hạn','\"Lễ tân\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:40:63:2026-09-23',NULL,NULL,NULL,'2026-09-30 16:38:34','2026-09-23 16:38:34'),(3167,16,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:16:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3168,6,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:6:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3169,5,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 24 giờ tới.','/#activity/5','task-deadline-24h:36:5:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3170,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3171,20,4,38,'task_overdue','Công việc trễ hạn','\"phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:38:20:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3172,23,4,39,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:39:23:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3173,63,4,40,'task_overdue','Công việc trễ hạn','\"Lễ tân\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:40:63:2026-09-24',NULL,NULL,NULL,'2026-09-30 17:08:34','2026-09-23 17:08:34'),(3267,16,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 4 giờ tới.','/#activity/5','task-deadline-4h:36:16:2026-09-24',NULL,NULL,NULL,'2026-09-30 19:38:34','2026-09-23 19:38:34'),(3268,6,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 4 giờ tới.','/#activity/5','task-deadline-4h:36:6:2026-09-24',NULL,NULL,NULL,'2026-09-30 19:38:34','2026-09-23 19:38:34'),(3269,5,5,36,'task_deadline_soon','Sắp đến hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" sẽ đến hạn trong 4 giờ tới.','/#activity/5','task-deadline-4h:36:5:2026-09-24',NULL,NULL,NULL,'2026-09-30 19:38:34','2026-09-23 19:38:34'),(3448,5,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:5:2026-09-24',NULL,NULL,NULL,'2026-10-01 00:08:34','2026-09-24 00:08:34'),(3449,6,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:6:2026-09-24',NULL,NULL,NULL,'2026-10-01 00:08:34','2026-09-24 00:08:34'),(3450,16,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:16:2026-09-24',NULL,NULL,NULL,'2026-10-01 00:08:34','2026-09-24 00:08:34'),(3617,5,4,41,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Bảo Trâm đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:41:5',NULL,NULL,NULL,'2026-10-01 04:30:02','2026-09-24 04:30:02'),(3618,6,4,41,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Bảo Trâm đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:41:6',NULL,NULL,NULL,'2026-10-01 04:30:02','2026-09-24 04:30:02'),(3619,16,4,41,'task_review','Nghiệm thu công việc tự ghi nhận','Nguyễn Bảo Trâm đã tự log việc: “Phỏng vấn” (Điểm: 4).','/#activity/4','task-self-log:41:16',NULL,NULL,NULL,'2026-10-01 04:30:02','2026-09-24 04:30:02'),(3627,17,4,41,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:41:17:2026-09-24',NULL,NULL,'2026-09-24 04:32:28','2026-10-01 04:31:26','2026-09-24 04:31:26'),(4170,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4171,5,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:5:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4172,6,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:6:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4173,16,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:16:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4174,20,4,38,'task_overdue','Công việc trễ hạn','\"phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:38:20:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4175,23,4,39,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:39:23:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4176,63,4,40,'task_overdue','Công việc trễ hạn','\"Lễ tân\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:40:63:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(4177,17,4,41,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:41:17:2026-09-25',NULL,NULL,NULL,'2026-10-01 17:01:26','2026-09-24 17:01:26'),(5226,24,4,29,'task_overdue','Công việc trễ hạn','\"Hỗ trợ PV (ghi chép thông tin)\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:29:24:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5227,5,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:5:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5228,6,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:6:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5229,16,5,36,'task_overdue','Công việc trễ hạn','\"Tổng hợp danh sách khen thưởng Đoàn Đại học\" trong \"Tổng hợp danh sách khen thưởng Đoàn Đại học & Giám đốc Đại học về công tác Đoàn\" đã quá hạn.','/#activity/5','task-overdue:36:16:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5230,20,4,38,'task_overdue','Công việc trễ hạn','\"phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:38:20:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5231,23,4,39,'task_overdue','Công việc trễ hạn','\"Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:39:23:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5232,63,4,40,'task_overdue','Công việc trễ hạn','\"Lễ tân\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:40:63:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28'),(5233,17,4,41,'task_overdue','Công việc trễ hạn','\"Phỏng vấn\" trong \"Tham gia tuyển thành viên Ban TCKT\" đã quá hạn.','/#activity/4','task-overdue:41:17:2026-09-26',NULL,NULL,NULL,'2026-10-02 17:01:28','2026-09-25 17:01:28');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participants`
--

DROP TABLE IF EXISTS `participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participants` (
  `activity_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `state` enum('volunteered','confirmed','declined') NOT NULL DEFAULT 'volunteered',
  `responsibility` varchar(255) DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`activity_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `participants_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `participants_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participants`
--

LOCK TABLES `participants` WRITE;
/*!40000 ALTER TABLE `participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('1JSty-G79nWaU9phJ3qqlVhnMXNmZ1SN',1790396402,'{\"cookie\":{\"originalMaxAge\":43200000,\"expires\":\"2026-09-26T04:18:08.860Z\",\"secure\":true,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":46,\"name\":\"Vũ Hải Anh\",\"email\":\"anh.vh2415485@sis.hust.edu.vn\",\"role\":\"member\",\"phone\":null,\"class_number\":\"Tiếng Anh KHKT 10 - K69\",\"faculty_notice_acknowledged_at\":null,\"avatar_color\":\"#315C4C\"}}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_assignees`
--

DROP TABLE IF EXISTS `task_assignees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_assignees` (
  `task_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `acknowledged_at` datetime DEFAULT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_assignees_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_assignees_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_assignees`
--

LOCK TABLES `task_assignees` WRITE;
/*!40000 ALTER TABLE `task_assignees` DISABLE KEYS */;
INSERT INTO `task_assignees` VALUES (4,48,1,'2026-09-19 02:14:49','2026-09-19 02:14:49'),(10,10,1,'2026-09-19 05:34:38','2026-09-19 05:34:38'),(11,37,1,'2026-09-19 05:35:44','2026-09-19 05:35:44'),(12,39,1,'2026-09-19 07:35:09','2026-09-19 07:35:09'),(13,56,1,'2026-09-19 07:53:59','2026-09-19 07:53:59'),(14,37,1,'2026-09-19 08:03:58','2026-09-19 08:03:58'),(15,37,1,'2026-09-19 08:05:23','2026-09-19 08:05:23'),(16,39,1,'2026-09-19 12:45:38','2026-09-19 12:45:38'),(17,16,1,'2026-09-19 16:00:11','2026-09-19 16:00:11'),(18,58,1,'2026-09-20 12:01:53','2026-09-20 12:01:53'),(19,23,1,'2026-09-20 12:29:07','2026-09-20 12:29:07'),(20,23,1,'2026-09-20 12:37:07','2026-09-20 12:37:07'),(21,9,1,'2026-09-20 15:37:25','2026-09-20 15:37:25'),(22,9,1,'2026-09-20 15:39:42','2026-09-20 15:39:42'),(23,57,1,'2026-09-20 16:59:31','2026-09-20 16:59:31'),(24,57,1,'2026-09-20 17:01:16','2026-09-20 17:01:16'),(25,44,1,'2026-09-20 17:51:26','2026-09-20 17:51:26'),(26,12,1,'2026-09-21 05:32:21','2026-09-21 05:32:21'),(27,51,1,'2026-09-21 05:42:51','2026-09-21 05:42:51'),(28,42,1,'2026-09-21 05:48:23','2026-09-21 05:48:23'),(29,24,1,'2026-09-21 06:31:24','2026-09-21 06:31:24'),(30,52,1,'2026-09-21 06:38:30','2026-09-21 06:38:30'),(31,40,1,'2026-09-21 08:50:32','2026-09-21 08:50:32'),(32,26,1,'2026-09-21 09:16:55','2026-09-21 09:16:55'),(33,15,1,'2026-09-21 13:24:00','2026-09-21 13:24:00'),(34,14,1,'2026-09-21 14:08:41','2026-09-21 14:08:41'),(35,11,1,'2026-09-21 16:01:09','2026-09-21 16:01:09'),(36,5,1,NULL,'2026-09-21 18:10:06'),(36,6,0,NULL,'2026-09-21 18:10:06'),(36,16,0,NULL,'2026-09-21 18:10:06'),(37,23,1,'2026-09-22 05:41:27','2026-09-22 05:41:27'),(38,20,1,'2026-09-22 05:52:02','2026-09-22 05:52:02'),(39,23,1,'2026-09-22 06:11:15','2026-09-22 06:11:15'),(40,63,1,'2026-09-23 16:31:19','2026-09-23 16:31:19'),(41,17,1,'2026-09-24 04:30:02','2026-09-24 04:30:02');
/*!40000 ALTER TABLE `task_assignees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_attachments`
--

DROP TABLE IF EXISTS `task_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_attachments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `task_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  `kind` enum('clarification','evidence','issue','deliverable') NOT NULL DEFAULT 'clarification',
  `label` varchar(180) NOT NULL,
  `link_url` varchar(1000) DEFAULT NULL,
  `stored_name` varchar(255) DEFAULT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type` varchar(120) DEFAULT NULL,
  `size_bytes` bigint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `task_attachments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_attachments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_attachments`
--

LOCK TABLES `task_attachments` WRITE;
/*!40000 ALTER TABLE `task_attachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_attachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_checklists`
--

DROP TABLE IF EXISTS `task_checklists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_checklists` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `task_id` int unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `is_done` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  `done_by` int unsigned DEFAULT NULL,
  `done_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `task_id` (`task_id`),
  KEY `done_by` (`done_by`),
  CONSTRAINT `task_checklists_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_checklists_ibfk_2` FOREIGN KEY (`done_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_checklists`
--

LOCK TABLES `task_checklists` WRITE;
/*!40000 ALTER TABLE `task_checklists` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_checklists` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `activity_id` int unsigned NOT NULL,
  `title` varchar(180) NOT NULL,
  `description` text,
  `stage` enum('before','during','after','general') NOT NULL DEFAULT 'general',
  `status` enum('todo','in_progress','review','done','cancelled') NOT NULL DEFAULT 'todo',
  `priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `team_id` int unsigned NOT NULL,
  `primary_assignee_id` int unsigned DEFAULT NULL,
  `assigned_by` int unsigned DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `deadline` date NOT NULL,
  `deliverable` varchar(255) DEFAULT NULL,
  `is_self_logged` tinyint(1) NOT NULL DEFAULT '0',
  `weight` tinyint unsigned NOT NULL DEFAULT '1',
  `submitted_for_review_at` datetime DEFAULT NULL,
  `reviewed_by` int unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_feedback` text,
  `completed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activity_id` (`activity_id`),
  KEY `team_id` (`team_id`),
  KEY `assignee_id` (`primary_assignee_id`),
  KEY `assigned_by` (`assigned_by`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`),
  CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`primary_assignee_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (4,4,'Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV','Xây dựng Hệ thống hỗ trợ Phỏng vấn TTV','general','done','medium',2,48,48,NULL,'2026-09-19',NULL,1,5,'2026-09-19 02:14:49',3,'2026-09-19 05:05:24',NULL,'2026-09-19 05:05:24','2026-09-19 02:14:49'),(10,4,'Phỏng vấn','Phỏng vấn','general','done','medium',4,10,10,NULL,'2026-09-19',NULL,1,6,'2026-09-19 05:34:38',31,'2026-09-21 10:43:27',NULL,'2026-09-21 10:43:27','2026-09-19 05:34:38'),(11,4,'Phỏng vấn','Phỏng ván','general','done','medium',3,37,37,NULL,'2026-09-19',NULL,1,4,'2026-09-19 05:35:44',31,'2026-09-21 10:43:35',NULL,'2026-09-21 10:43:35','2026-09-19 05:35:44'),(12,4,'3 — Trọng trách / Đột xuất',NULL,'general','cancelled','medium',3,39,39,NULL,'2026-09-19',NULL,1,3,'2026-09-19 07:35:09',NULL,NULL,NULL,NULL,'2026-09-19 07:35:09'),(13,4,'Checkin',NULL,'general','done','medium',2,56,56,NULL,'2026-09-19',NULL,1,2,'2026-09-19 07:53:59',48,'2026-09-19 16:11:44',NULL,'2026-09-19 16:11:44','2026-09-19 07:53:59'),(14,4,'Phỏng vấn',NULL,'general','cancelled','medium',3,37,37,NULL,'2026-09-19',NULL,1,6,'2026-09-19 08:03:58',NULL,NULL,NULL,NULL,'2026-09-19 08:03:58'),(15,4,'Phỏng vấn','Kíp 3','general','done','medium',3,37,37,NULL,'2026-09-19',NULL,1,2,'2026-09-19 08:05:23',31,'2026-09-21 17:51:20',NULL,'2026-09-21 17:51:20','2026-09-19 08:05:23'),(16,4,'Check in',NULL,'general','done','medium',3,39,39,NULL,'2026-09-19',NULL,1,3,'2026-09-19 12:45:38',31,'2026-09-21 17:51:47',NULL,'2026-09-21 17:51:47','2026-09-19 12:45:38'),(17,4,'Phỏng vấn',NULL,'general','done','medium',4,16,16,NULL,'2026-09-19',NULL,1,6,'2026-09-19 16:00:11',31,'2026-09-21 17:51:26',NULL,'2026-09-21 17:51:26','2026-09-19 16:00:11'),(18,4,'Check in',NULL,'general','done','medium',2,58,58,NULL,'2026-09-19',NULL,1,2,'2026-09-20 12:01:53',52,'2026-09-21 06:40:03',NULL,'2026-09-21 06:40:03','2026-09-20 12:01:53'),(19,4,'Trực bàn tuyển thành viên',NULL,'general','done','medium',4,23,23,NULL,'2026-09-19',NULL,1,1,'2026-09-20 12:29:07',31,'2026-09-21 17:52:43',NULL,'2026-09-21 17:52:43','2026-09-20 12:29:07'),(20,4,'Tham gia phỏng vấn','Phỏng vấn và ghi nhận xét ứng viên vào sheet','general','cancelled','medium',4,23,23,NULL,'2026-09-19',NULL,1,2,'2026-09-20 12:37:07',31,'2026-09-21 10:44:41','Hỗ trợ CSNN không được xác nhận khi chưa xin phép',NULL,'2026-09-20 12:37:07'),(21,4,'Phỏng vấn',NULL,'general','cancelled','medium',4,9,9,NULL,'2026-09-19',NULL,1,2,'2026-09-20 15:37:25',NULL,NULL,NULL,NULL,'2026-09-20 15:37:25'),(22,4,'Phỏng vấn',NULL,'general','done','medium',4,9,9,NULL,'2026-09-19',NULL,1,4,'2026-09-20 15:39:42',31,'2026-09-21 17:51:29',NULL,'2026-09-21 17:51:29','2026-09-20 15:39:42'),(23,4,'Phỏng vấn',NULL,'general','done','medium',2,57,57,NULL,'2026-09-19',NULL,1,6,'2026-09-20 16:59:31',52,'2026-09-21 06:40:08',NULL,'2026-09-21 06:40:08','2026-09-20 16:59:31'),(24,4,'Checkin',NULL,'general','done','medium',2,57,57,NULL,'2026-09-19',NULL,1,1,'2026-09-20 17:01:16',52,'2026-09-21 06:40:14',NULL,'2026-09-21 06:40:14','2026-09-20 17:01:16'),(25,4,'Check in',NULL,'general','done','medium',3,44,44,NULL,'2026-09-19',NULL,1,1,'2026-09-20 17:51:26',31,'2026-09-21 17:51:42',NULL,'2026-09-21 17:51:42','2026-09-20 17:51:26'),(26,4,'Phỏng vấn',NULL,'general','done','medium',4,12,12,NULL,'2026-09-19',NULL,1,4,'2026-09-21 05:32:21',31,'2026-09-21 17:51:45',NULL,'2026-09-21 17:51:45','2026-09-21 05:32:21'),(27,4,'Phỏng vấn',NULL,'general','done','medium',2,51,51,NULL,'2026-09-19',NULL,1,5,'2026-09-21 05:42:51',52,'2026-09-21 06:40:19',NULL,'2026-09-21 06:40:19','2026-09-21 05:42:51'),(28,4,'1 — Tiêu chuẩn / Lặp lại','check-in','general','cancelled','medium',3,42,42,NULL,'2026-09-19',NULL,1,1,'2026-09-21 05:48:23',31,'2026-09-21 17:52:39','Chưa có ghi rõ công việc, yêu cầu bổ sung công việc cụ thể',NULL,'2026-09-21 05:48:23'),(29,4,'Hỗ trợ PV (ghi chép thông tin)','Tham gia 3 kíp','general','in_progress','medium',4,24,24,NULL,'2026-09-19',NULL,1,6,'2026-09-21 06:31:24',31,'2026-09-21 10:45:18','Điều chỉnh lại hệ số, chỉ tính 4 điểm cho toàn bộ công tác',NULL,'2026-09-21 06:31:24'),(30,4,'Phỏng vấn',NULL,'general','done','medium',2,52,52,NULL,'2026-09-19',NULL,1,6,'2026-09-21 06:38:30',52,'2026-09-21 06:40:24',NULL,'2026-09-21 06:40:24','2026-09-21 06:38:30'),(31,4,'0 — Tham gia / Hỗ trợ nhẹ',NULL,'general','cancelled','medium',3,40,40,NULL,'2026-09-19',NULL,1,0,'2026-09-21 08:50:32',31,'2026-09-21 10:45:35','Không tham gia',NULL,'2026-09-21 08:50:32'),(32,4,'Check-in','Hỗ trợ check-in, đưa các bạn qua phòng phỏng vấn','general','done','medium',4,26,26,NULL,'2026-09-19',NULL,1,3,'2026-09-21 09:16:55',31,'2026-09-21 10:43:53',NULL,'2026-09-21 10:43:53','2026-09-21 09:16:55'),(33,4,'Phỏng vấn','Phỏng vấn tuyển thành viên ban','general','done','medium',4,15,15,NULL,'2026-09-19',NULL,1,9,'2026-09-21 13:24:00',31,'2026-09-21 17:51:55',NULL,'2026-09-21 17:51:55','2026-09-21 13:24:00'),(34,4,'Checkin',NULL,'general','done','medium',4,14,14,NULL,'2026-09-19',NULL,1,2,'2026-09-21 14:08:41',31,'2026-09-21 17:51:50',NULL,'2026-09-21 17:51:50','2026-09-21 14:08:41'),(35,4,'Phỏng vấn tuyển thành viên',NULL,'general','done','medium',4,11,11,NULL,'2026-09-19',NULL,1,6,'2026-09-21 16:01:09',31,'2026-09-21 17:51:37',NULL,'2026-09-21 17:51:37','2026-09-21 16:01:09'),(36,5,'Tổng hợp danh sách khen thưởng Đoàn Đại học',NULL,'before','todo','medium',4,5,31,'2026-09-21','2026-09-24',NULL,0,1,NULL,NULL,NULL,NULL,NULL,'2026-09-21 18:10:06'),(37,4,'Tham gia hỗ trợ phỏng vấn','Phỏng vấn bàn 6 kíp 4 và ghi nhận xét vào sheet','general','cancelled','medium',4,23,23,NULL,'2026-09-19',NULL,1,2,'2026-09-22 05:41:27',NULL,NULL,NULL,NULL,'2026-09-22 05:41:27'),(38,4,'phỏng vấn',NULL,'general','review','medium',4,20,20,NULL,'2026-09-19',NULL,1,4,'2026-09-22 05:52:02',NULL,NULL,NULL,NULL,'2026-09-22 05:52:02'),(39,4,'Tham gia hỗ trợ phỏng vấn Ban Tổ chức - Kiểm tra','Phỏng vấn bàn 6 kíp 4 và ghi nhận xét vào sheet','general','review','medium',4,23,23,NULL,'2026-09-19',NULL,1,2,'2026-09-22 06:11:15',NULL,NULL,NULL,NULL,'2026-09-22 06:11:15'),(40,4,'Lễ tân','Hướng dẫn ứng viên quét QR lấy số và dẫn ứng viên tới các bàn tương ứng','general','review','medium',5,63,63,NULL,'2026-09-19',NULL,1,3,'2026-09-23 16:31:19',NULL,NULL,NULL,NULL,'2026-09-23 16:31:19'),(41,4,'Phỏng vấn','Phỏng vấn 2 kíp','general','review','medium',4,17,17,NULL,'2026-09-19',NULL,1,4,'2026-09-24 04:30:02',NULL,NULL,NULL,NULL,'2026-09-24 04:30:02');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `color` char(7) NOT NULL DEFAULT '#315C4C',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
INSERT INTO `teams` VALUES (2,'Phát triển Đảng và Chuyển đổi số',NULL,'#1e3a8a',1,0,'2026-09-18 16:20:37'),(3,'Giám sát, Kiểm tra và Điểm rèn luyện',NULL,'#1e3a8a',1,0,'2026-09-18 16:20:58'),(4,'Tổ chức và Phát triển Đoàn vụ',NULL,'#1e3a8a',1,0,'2026-09-18 16:21:14'),(5,'Truyền thông – Sự kiện và Phát triển nội bộ',NULL,'#1e3a8a',1,0,'2026-09-18 16:21:27'),(6,'Thường trực Ban',NULL,'#bd0000',1,0,'2026-09-18 16:40:17');
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `update_tagged_users`
--

DROP TABLE IF EXISTS `update_tagged_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `update_tagged_users` (
  `update_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  PRIMARY KEY (`update_id`,`user_id`),
  KEY `update_tagged_users_user` (`user_id`),
  CONSTRAINT `update_tagged_users_ibfk_1` FOREIGN KEY (`update_id`) REFERENCES `updates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `update_tagged_users_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `update_tagged_users`
--

LOCK TABLES `update_tagged_users` WRITE;
/*!40000 ALTER TABLE `update_tagged_users` DISABLE KEYS */;
/*!40000 ALTER TABLE `update_tagged_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `updates`
--

DROP TABLE IF EXISTS `updates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `updates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `activity_id` int unsigned NOT NULL,
  `task_id` int unsigned DEFAULT NULL,
  `user_id` int unsigned NOT NULL,
  `tagged_user_id` int unsigned DEFAULT NULL,
  `body` text NOT NULL,
  `kind` enum('comment','progress','evidence','issue','review_note') NOT NULL DEFAULT 'comment',
  `attachment_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `activity_id` (`activity_id`),
  KEY `task_id` (`task_id`),
  KEY `user_id` (`user_id`),
  KEY `tagged_user_id` (`tagged_user_id`),
  CONSTRAINT `updates_ibfk_1` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `updates_ibfk_2` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `updates_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `updates_ibfk_4` FOREIGN KEY (`tagged_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `updates`
--

LOCK TABLES `updates` WRITE;
/*!40000 ALTER TABLE `updates` DISABLE KEYS */;
INSERT INTO `updates` VALUES (3,4,4,48,NULL,'Phạm Việt Bách đã tự ghi nhận công việc (Điểm trọng số: 5).','evidence',NULL,'2026-09-19 02:14:49'),(16,4,4,3,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-19 05:05:24'),(17,4,10,10,NULL,'Ngô Quỳnh Ngọc đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-19 05:34:38'),(18,4,11,37,NULL,'Dư Thị Khánh Hoà đã tự ghi nhận công việc (Điểm trọng số: 4).','evidence',NULL,'2026-09-19 05:35:44'),(19,4,12,39,NULL,'Nguyễn Đức Thái Tùng đã tự ghi nhận công việc (Điểm trọng số: 3).','evidence',NULL,'2026-09-19 07:35:09'),(20,4,13,56,NULL,'Nguyễn Trần Minh Trí đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-19 07:53:59'),(21,4,14,37,NULL,'Dư Thị Khánh Hoà đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-19 08:03:58'),(22,4,14,37,NULL,'Dư Thị Khánh Hoà đã rút lại công việc tự ghi nhận này.','progress',NULL,'2026-09-19 08:04:30'),(23,4,15,37,NULL,'Dư Thị Khánh Hoà đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-19 08:05:23'),(24,4,12,39,NULL,'Nguyễn Đức Thái Tùng đã rút lại công việc tự ghi nhận này.','progress',NULL,'2026-09-19 12:45:21'),(25,4,16,39,NULL,'Nguyễn Đức Thái Tùng đã tự ghi nhận công việc (Điểm trọng số: 3).','evidence',NULL,'2026-09-19 12:45:38'),(26,4,17,16,NULL,'Ngô Thu Hằng đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-19 16:00:11'),(27,4,13,48,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-19 16:11:44'),(28,4,18,58,NULL,'Đào Khánh Huyền đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-20 12:01:53'),(29,4,19,23,NULL,'Tạ Quang Huy đã tự ghi nhận công việc (Điểm trọng số: 1).','evidence',NULL,'2026-09-20 12:29:07'),(30,4,20,23,NULL,'Tạ Quang Huy đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-20 12:37:07'),(31,4,21,9,NULL,'Nguyễn Hải Long đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-20 15:37:25'),(32,4,21,9,NULL,'Nguyễn Hải Long đã rút lại công việc tự ghi nhận này.','progress',NULL,'2026-09-20 15:38:08'),(33,4,22,9,NULL,'Nguyễn Hải Long đã tự ghi nhận công việc (Điểm trọng số: 4).','evidence',NULL,'2026-09-20 15:39:42'),(34,4,23,57,NULL,'Ngô Đình Quảng Đức đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-20 16:59:31'),(35,4,24,57,NULL,'Ngô Đình Quảng Đức đã tự ghi nhận công việc (Điểm trọng số: 1).','evidence',NULL,'2026-09-20 17:01:16'),(36,4,25,44,NULL,'Lâm Đức Mạnh đã tự ghi nhận công việc (Điểm trọng số: 1).','evidence',NULL,'2026-09-20 17:51:26'),(37,4,26,12,NULL,'Vương Nam Phương đã tự ghi nhận công việc (Điểm trọng số: 4).','evidence',NULL,'2026-09-21 05:32:21'),(38,4,27,51,NULL,'Phạm Văn Minh đã tự ghi nhận công việc (Điểm trọng số: 5).','evidence',NULL,'2026-09-21 05:42:51'),(39,4,28,42,NULL,'Trần Thị Ngọc Tân đã tự ghi nhận công việc (Điểm trọng số: 1).','evidence',NULL,'2026-09-21 05:48:23'),(40,4,29,24,NULL,'Ngô Công Nam đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-21 06:31:24'),(41,4,30,52,NULL,'Nguyễn Văn Gia Huy đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-21 06:38:30'),(42,4,18,52,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 06:40:03'),(43,4,23,52,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 06:40:08'),(44,4,24,52,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 06:40:14'),(45,4,27,52,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 06:40:19'),(46,4,30,52,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 06:40:24'),(47,4,31,40,NULL,'Đặng Lê Quang Minh đã tự ghi nhận công việc (Điểm trọng số: 0).','evidence',NULL,'2026-09-21 08:50:32'),(48,4,32,26,NULL,'Trần Hoàng Linh đã tự ghi nhận công việc (Điểm trọng số: 3).','evidence',NULL,'2026-09-21 09:16:55'),(49,4,10,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 10:43:27'),(50,4,11,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 10:43:35'),(51,4,32,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 10:43:53'),(52,4,20,31,NULL,'Hỗ trợ hoạt động cho CSNN. Ban TCKT không duyệt','comment',NULL,'2026-09-21 10:44:18'),(53,4,20,31,NULL,'Đã bác bỏ: Hỗ trợ CSNN không được xác nhận khi chưa xin phép','review_note',NULL,'2026-09-21 10:44:41'),(54,4,29,31,NULL,'Yêu cầu làm lại: Điều chỉnh lại hệ số, chỉ tính 4 điểm cho toàn bộ công tác','review_note',NULL,'2026-09-21 10:45:18'),(55,4,31,31,NULL,'Đã bác bỏ: Không tham gia','review_note',NULL,'2026-09-21 10:45:35'),(56,4,33,15,NULL,'Lê Trọng Nhân đã tự ghi nhận công việc (Điểm trọng số: 9).','evidence',NULL,'2026-09-21 13:24:00'),(57,4,34,14,NULL,'Thái Huy Vũ Quang đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-21 14:08:41'),(58,4,35,11,NULL,'Đặng Thị Trà My đã tự ghi nhận công việc (Điểm trọng số: 6).','evidence',NULL,'2026-09-21 16:01:09'),(59,4,15,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:20'),(60,4,17,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:26'),(61,4,22,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:29'),(62,4,35,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:37'),(63,4,25,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:42'),(64,4,26,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:45'),(65,4,16,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:47'),(66,4,34,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:50'),(67,4,33,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:51:55'),(68,4,28,31,NULL,'Đã bác bỏ: Chưa có ghi rõ công việc, yêu cầu bổ sung công việc cụ thể','review_note',NULL,'2026-09-21 17:52:39'),(69,4,19,31,NULL,'Đã duyệt đạt.','review_note',NULL,'2026-09-21 17:52:43'),(70,4,37,23,NULL,'Tạ Quang Huy đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-22 05:41:27'),(71,4,38,20,NULL,'Nguyễn Thu Hằng đã tự ghi nhận công việc (Điểm trọng số: 4).','evidence',NULL,'2026-09-22 05:52:02'),(72,4,37,23,NULL,'Tạ Quang Huy đã rút lại công việc tự ghi nhận này.','progress',NULL,'2026-09-22 06:10:40'),(73,4,39,23,NULL,'Tạ Quang Huy đã tự ghi nhận công việc (Điểm trọng số: 2).','evidence',NULL,'2026-09-22 06:11:15'),(74,4,40,63,NULL,'Nguyễn Như Gia Linh đã tự ghi nhận công việc (Điểm trọng số: 3).','evidence',NULL,'2026-09-23 16:31:19'),(75,4,41,17,NULL,'Nguyễn Bảo Trâm đã tự ghi nhận công việc (Điểm trọng số: 4).','evidence',NULL,'2026-09-24 04:30:02');
/*!40000 ALTER TABLE `updates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_teams`
--

DROP TABLE IF EXISTS `user_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_teams` (
  `user_id` int unsigned NOT NULL,
  `team_id` int unsigned NOT NULL,
  `is_lead` tinyint(1) NOT NULL DEFAULT '0',
  `is_vice_lead` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`,`team_id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `user_teams_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_teams_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_teams`
--

LOCK TABLES `user_teams` WRITE;
/*!40000 ALTER TABLE `user_teams` DISABLE KEYS */;
INSERT INTO `user_teams` VALUES (2,2,0,1),(5,4,1,0),(6,4,0,1),(7,4,0,0),(8,4,0,0),(9,4,0,0),(10,4,0,0),(11,4,0,0),(12,4,0,0),(13,4,0,0),(14,4,0,0),(15,4,0,0),(16,4,0,1),(17,4,0,0),(18,4,0,0),(19,4,0,0),(20,4,0,0),(21,4,0,0),(22,4,0,0),(23,4,0,0),(24,4,0,0),(25,4,0,0),(26,4,0,0),(27,4,0,0),(28,4,0,0),(29,6,0,0),(30,6,0,0),(31,6,0,0),(32,6,0,0),(33,3,1,0),(34,3,0,1),(35,3,0,0),(36,3,0,0),(37,3,0,0),(38,3,0,0),(39,3,0,0),(40,3,0,0),(41,3,0,0),(42,3,0,0),(43,3,0,0),(44,3,0,0),(45,3,0,0),(46,3,0,0),(47,3,0,0),(48,2,1,0),(49,2,0,1),(50,2,0,0),(51,2,0,0),(52,2,0,1),(53,2,0,0),(54,2,0,0),(55,2,0,0),(56,2,0,0),(57,2,0,0),(58,2,0,0),(59,2,0,0),(60,2,0,0),(61,2,0,0),(62,5,1,0),(63,5,0,0),(64,5,0,0),(65,5,0,0),(66,5,0,0),(67,5,0,0);
/*!40000 ALTER TABLE `user_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','vice_admin','leader','vice_leader','member') NOT NULL DEFAULT 'member',
  `auth_provider` enum('local','microsoft') NOT NULL DEFAULT 'local',
  `phone` varchar(30) DEFAULT NULL,
  `class_number` varchar(100) DEFAULT NULL,
  `faculty_notice_acknowledged_at` datetime DEFAULT NULL,
  `avatar_color` char(7) NOT NULL DEFAULT '#315C4C',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'Phan Tuấn Dương','duong.pt2518749@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-16 12:07:26'),(3,'TCKT Global Admin','tckt.dtn@hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','admin','local',NULL,NULL,'2026-09-17 05:06:33','#315C4C',1,'2026-09-17 03:48:31'),(5,'Nguyễn Thanh An','an.nt2416840@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','leader','local',NULL,'Việt Nhật 03 - K69',NULL,'#315c4c',1,'2026-09-18 16:36:09'),(6,'Đặng Thị Thùy Dương','duong.dtt237318@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:36:09'),(7,'Nguyễn Ngọc Huyền','huyen.nn2410372@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:09'),(8,'Vương Đồng Đức','duc.vd2420371@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:09'),(9,'Nguyễn Hải Long','long.nh2412613@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'KT Điều khiển - Tự động hóa 07 - K69',NULL,'#315C4C',1,'2026-09-18 16:36:09'),(10,'Ngô Quỳnh Ngọc','ngoc.nq2410464@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Thực phẩm 05',NULL,'#315C4C',1,'2026-09-18 16:36:09'),(11,'Đặng Thị Trà My','my.dtt2419869@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Kỹ thuật In 02- K69',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(12,'Vương Nam Phương','phuong.vn2413774@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Phân tích kinh doanh 02',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(13,'Hồng Minh Khang','khang.hm233855@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:10'),(14,'Thái Huy Vũ Quang','quang.thv2412914@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Điện 1',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(15,'Lê Trọng Nhân','nhan.lt230396p@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'KT oto-k68',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(16,'Ngô Thu Hằng','hang.nt2513652@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,'Kinh doanh 01',NULL,'#315c4c',1,'2026-09-18 16:36:10'),(17,'Nguyễn Bảo Trâm','tram.nb2513735@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'phân tích kinh doanh 02',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(18,'Cao Nhất Đăng','dang.cn2512334@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Kỹ thuật Điều khiển - Tự động hóa 04',NULL,'#315C4C',1,'2026-09-18 16:36:10'),(19,'Nguyễn Huy Hoàng','hoang.nh2520018@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:10'),(20,'Nguyễn Thu Hằng','hang.nt2518611@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Toán Tin 04',NULL,'#9ff3fe',1,'2026-09-18 16:36:11'),(21,'Trần Thị Quyên','quyen.tt238221@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:11'),(22,'Nguyễn Thị Tuyết Huế','hue.ntt2411628@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:11'),(23,'Tạ Quang Huy','huy.tq2516806@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Việt Nhật 01-K70',NULL,'#315C4C',1,'2026-09-18 16:36:11'),(24,'Ngô Công Nam','nam.nc2517036@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'ICT',NULL,'#315C4C',1,'2026-09-18 16:36:11'),(25,'Bùi Thị Ngọc Diệu','dieu.btn2411574@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Hóa học 04',NULL,'#315C4C',1,'2026-09-18 16:36:11'),(26,'Trần Hoàng Linh','linh.th2520337@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Hàng không 2',NULL,'#315C4C',1,'2026-09-18 16:36:11'),(27,'Đặng Ngọc Ánh','anh.dn2515516@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:11'),(28,'Trần Lê Thu Thảo','thao.tlt2410553@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:36:11'),(29,'PGS.TS. Phan Duy Nam','nam.phanduy@hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','admin','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:39:49'),(30,'TS. Nguyễn Đình Văn','van.nguyendinh@hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_admin','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:39:50'),(31,'Trần Đức Hoàng Anh','anh.tdh250154e@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_admin','local',NULL,'KS- Kỹ thuật điện - K70',NULL,'#315c4c',1,'2026-09-18 16:39:50'),(32,'Kiều Minh Anh','anh.km2415833@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_admin','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:39:50'),(33,'Lê Trần Cẩm Dung','dung.ltc2410053@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','leader','local',NULL,'Điện gì đó',NULL,'#315c4c',1,'2026-09-18 16:48:48'),(34,'Nguyễn Long Vũ','vu.nl2412337@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:48:48'),(35,'Đậu Thị Thanh Trúc','truc.dtt231203@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'CN Hoá dược & BVTV K68',NULL,'#315C4C',1,'2026-09-18 16:48:48'),(36,'Nguyễn Thu Hường','huong.nt231594@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Công nghệ giáo dục 02',NULL,'#315C4C',1,'2026-09-18 16:48:48'),(37,'Dư Thị Khánh Hoà','hoa.dtk2413217@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Quản lý Công nghiệp 02 - K69',NULL,'#315C4C',1,'2026-09-18 16:48:48'),(38,'Đỗ Thành Hiếu','hieu.dt2411619@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:48:49'),(39,'Nguyễn Đức Thái Tùng','tung.ndt2511752@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'CTTT Hóa dược 03',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(40,'Đặng Lê Quang Minh','minh.dlq2511712@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'CTTT Hóa dược 02',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(41,'Lê Thị Thuỳ Linh','linh.ltt2410407@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:48:49'),(42,'Trần Thị Ngọc Tân','tan.ttn2413431@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'EM3-01',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(43,'Nguyễn Thị Diệu Linh','linh.ntd2411669@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:48:49'),(44,'Lâm Đức Mạnh','manh.ld2517025@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'ICT 01',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(45,'Hoàng Lâm Quế','que.hl2517956@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Kt Cơ khí 14',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(46,'Vũ Hải Anh','anh.vh2415485@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Tiếng Anh KHKT 10 - K69',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(47,'Nguyễn Đình Toàn','toan.nd2518032@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Kỹ thuật Cơ khí 06',NULL,'#315C4C',1,'2026-09-18 16:48:49'),(48,'Phạm Việt Bách','bach.pv2414676@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','leader','local',NULL,'CTTT Điện tử 02',NULL,'#315c4c',1,'2026-09-18 16:50:33'),(49,'Cao Hương Quỳnh','quynh.ch238125@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:50:33'),(50,'Lê Quang Đăng','dang.lq2419678@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:50:33'),(51,'Phạm Văn Minh','minh.pv233534@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Điện tử',NULL,'#315C4C',1,'2026-09-18 16:50:33'),(52,'Nguyễn Văn Gia Huy','huy.nvg2516805@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','vice_leader','local',NULL,'Việt Nhật 04',NULL,'#315c4c',1,'2026-09-18 16:50:33'),(53,'Đỗ Nhật Quang','quang.dn2517103@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:50:33'),(54,'Phan Hoàng Trung Nghĩa','nghia.pht2517099@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'IT-EP',NULL,'#70f5c6',1,'2026-09-18 16:50:34'),(55,'Phạm Nguyễn Bảo Anh','anh.pnb2413658@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:50:34'),(56,'Nguyễn Trần Minh Trí','tri.ntm2400116@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'DSAI 03',NULL,'#315C4C',1,'2026-09-18 16:50:34'),(57,'Ngô Đình Quảng Đức','duc.ndq2514474@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Y sinh 01',NULL,'#315C4C',1,'2026-09-18 16:50:34'),(58,'Đào Khánh Huyền','huyen.dk2513666@sis.hust.edu.vn','$2b$10$1/Aq7LLhLnt.kn3Xg5GIMO2Wn7gsJfSR2s8BD0Tm8pxhBRen6/Kp2','member','local',NULL,'1',NULL,'#315c4c',1,'2026-09-18 16:50:34'),(59,'Vũ Thị Minh Anh','anh.vtm2513770@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:50:34'),(60,'Tạ Minh Hiếu','hieu.tm2516096@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'Kỹ sư tài năng Khoa học máy tính',NULL,'#315C4C',1,'2026-09-18 16:50:34'),(61,'Vũ Hồng Phúc','phuc.vh2518784@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'MI2-02',NULL,'#315C4C',1,'2026-09-18 16:50:34'),(62,'Trịnh Lương Việt','viet.tl236012@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','leader','local',NULL,NULL,NULL,'#315c4c',1,'2026-09-18 16:55:59'),(63,'Nguyễn Như Gia Linh','linh.nng2515398@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,'FL1.06',NULL,'#315C4C',1,'2026-09-18 16:55:59'),(64,'Trần Anh Duy','duy.ta2517087@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:56:00'),(65,'Diêm Quỳnh Hoa','hoa.dq2514492@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:56:00'),(66,'Nguyễn Văn Dũng','dung.nv2516543@sis.hust.edu.vn','$2b$10$g1K3ESLOkW7zadSfUIGjn..VAvGvriPENT3svmyuRk2tCu5Wm5vZe','member','local',NULL,'Data science & AI 02',NULL,'#315c4c',1,'2026-09-18 16:56:00'),(67,'Lâm Quốc Dũng','dung.lq2419500@sis.hust.edu.vn','$2a$12$p1Ee24EYWv.tDZBO.myvzOXg903zZptWGDc9mWhMfcbzuvIL9jkF.','member','local',NULL,NULL,NULL,'#315C4C',1,'2026-09-18 16:56:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `weight_presets`
--

DROP TABLE IF EXISTS `weight_presets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weight_presets` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `label` varchar(120) NOT NULL,
  `points` tinyint unsigned NOT NULL DEFAULT '1',
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `weight_presets`
--

LOCK TABLES `weight_presets` WRITE;
/*!40000 ALTER TABLE `weight_presets` DISABLE KEYS */;
INSERT INTO `weight_presets` VALUES (1,'0 — Tham gia / Hỗ trợ nhẹ',0,'Không tính điểm khối lượng',1,1,'2026-09-17 09:58:26','2026-09-17 09:58:26'),(2,'1 — Tiêu chuẩn / Lặp lại',1,'Trực phòng làm việc, trực bàn sự kiện, chuẩn bị hậu cần',1,2,'2026-09-17 09:58:26','2026-09-17 09:58:26'),(3,'2 — Trung bình / Có sản phẩm',2,'Thiết kế ấn phẩm, viết bài truyền thông, phụ trách kỹ thuật',1,3,'2026-09-17 09:58:26','2026-09-17 09:58:26'),(4,'3 — Trọng trách / Đột xuất',3,'Xử lý sự cố gấp, quản lý khu vực sự kiện',1,4,'2026-09-17 09:58:26','2026-09-17 09:58:26'),(5,'5 — Trọng điểm / Quy mô lớn',5,'Điều phối chính, phụ trách toàn bộ 1 mảng lớn',1,5,'2026-09-17 09:58:26','2026-09-17 09:58:26');
/*!40000 ALTER TABLE `weight_presets` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-26  2:23:29
