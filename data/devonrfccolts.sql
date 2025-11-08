/*
 Data Design

 Source Server         : LOCALHOST
 Source Server Type    : MySQL
 Source Server Version : 80403 (8.4.3)
 Source Host           : localhost:3306
 Database              : devonrfccolts

 Target Server Type    : MySQL
 Target Server Version : 80403 (8.4.3)
 File Encoding         : 65001

 Date: 04/11/2025 21:13:24
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tblfixtures
-- ----------------------------
DROP TABLE IF EXISTS `tblfixtures`;
CREATE TABLE `tblfixtures`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `leagueID` int NOT NULL COMMENT 'FK tblLeagues.id',
  `homeTeam` int NOT NULL COMMENT 'FK tblTeams.id',
  `awayTeam` int NOT NULL COMMENT 'FK tblTeams.id',
  `date` datetime NOT NULL,
  `venue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `referee` int NULL DEFAULT NULL COMMENT 'FK tblUsers.id',
  `status` int NOT NULL DEFAULT 0 COMMENT '0 Forthcoming 1 underway 2 completed 3 cancelled 4 abandoned',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tblleagues
-- ----------------------------
DROP TABLE IF EXISTS `tblleagues`;
CREATE TABLE `tblleagues`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `leagueName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `leagueSeason` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tblresults
-- ----------------------------
DROP TABLE IF EXISTS `tblresults`;
CREATE TABLE `tblresults`  (
  `id` int AUTO_INCREMENT NOT NULL,
  `fixtureID` int NOT NULL COMMENT 'FK tblFixture.id',
  `homeScore` int NOT NULL DEFAULT 0,
  `awayScore` int NOT NULL DEFAULT 0,
  `homeScorers` json NULL,
  `awayScorers` json NULL,
  `submittedBy` int NOT NULL COMMENT 'FK tblUsers.id',
  `dateSubmitted` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tblstandings
-- ----------------------------
DROP TABLE IF EXISTS `tblstandings`;
CREATE TABLE `tblstandings`  (
  `id` int AUTO_INCREMENT NOT NULL,
  `leagueID` int NOT NULL COMMENT 'FK tblLeagues.id',
  `teamID` int NOT NULL COMMENT 'FK tblTeams.id',
  `played` int NOT NULL DEFAULT 0,
  `won` int NOT NULL DEFAULT 0,
  `drawn` int NOT NULL DEFAULT 0,
  `lost` int NOT NULL DEFAULT 0,
  `pointsFor` int NOT NULL DEFAULT 0,
  `pointsAgainst` int NOT NULL DEFAULT 0,
  `pointsDifference` int NOT NULL DEFAULT 0,
  `bonusPoints` int NOT NULL DEFAULT 0,
  `points` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tblteams
-- ----------------------------
DROP TABLE IF EXISTS `tblteams`;
CREATE TABLE `tblteams`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `teamName` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `teamClub` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `teamLogo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'base64Encoded',
  `playsIn` int NOT NULL COMMENT 'FK tblLeagues.id ',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for tblusers
-- ----------------------------
DROP TABLE IF EXISTS `tblusers`;
CREATE TABLE `tblusers`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `firstName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `lastName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `login` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'md5 hash',
  `authority` int NOT NULL DEFAULT 0 COMMENT '0 spectator 1 local admin  2 full admin',
  `authorityOver` int NOT NULL DEFAULT 0 COMMENT '0 None >0 FK tblTeams',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
