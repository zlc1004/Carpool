-- CodePush Database Initialization
CREATE DATABASE IF NOT EXISTS `codepush` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create CodePush user
CREATE USER IF NOT EXISTS 'codepush'@'%' IDENTIFIED BY '';
GRANT ALL PRIVILEGES ON `codepush`.* TO 'codepush'@'%';
FLUSH PRIVILEGES;

USE `codepush`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL UNIQUE,
  `password` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Apps table
CREATE TABLE IF NOT EXISTS `apps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `os` enum('iOS','Android') NOT NULL,
  `platform` varchar(255) NOT NULL DEFAULT 'React Native',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_os` (`name`, `os`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deployments table
CREATE TABLE IF NOT EXISTS `deployments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `key_` varchar(255) NOT NULL UNIQUE,
  `appId` int(11) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `appId` (`appId`),
  CONSTRAINT `deployments_ibfk_1` FOREIGN KEY (`appId`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Packages table
CREATE TABLE IF NOT EXISTS `packages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deploymentId` int(11) NOT NULL,
  `description` text,
  `packageHash` varchar(255) NOT NULL,
  `blobUrl` varchar(1000) NOT NULL,
  `size` int(11) NOT NULL DEFAULT '0',
  `manifestBlobUrl` varchar(1000) NOT NULL,
  `releaseMethod` enum('Upload','Promote','Rollback') NOT NULL DEFAULT 'Upload',
  `originalLabel` varchar(255) DEFAULT NULL,
  `originalDeployment` varchar(255) DEFAULT NULL,
  `releasedBy` varchar(255) NOT NULL,
  `isMandatory` tinyint(1) NOT NULL DEFAULT '0',
  `isDisabled` tinyint(1) NOT NULL DEFAULT '0',
  `rollout` int(11) NOT NULL DEFAULT '100',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `deploymentId` (`deploymentId`),
  KEY `packageHash` (`packageHash`),
  CONSTRAINT `packages_ibfk_1` FOREIGN KEY (`deploymentId`) REFERENCES `deployments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Package diff table
CREATE TABLE IF NOT EXISTS `packages_diff` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `packageId` int(11) NOT NULL,
  `diffAgainstPackageHash` varchar(255) NOT NULL,
  `url` varchar(1000) NOT NULL,
  `size` int(11) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `packageId` (`packageId`),
  KEY `diffAgainstPackageHash` (`diffAgainstPackageHash`),
  CONSTRAINT `packages_diff_ibfk_1` FOREIGN KEY (`packageId`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Package metrics table
CREATE TABLE IF NOT EXISTS `package_metrics` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `packageId` int(11) NOT NULL,
  `appVersion` varchar(255) NOT NULL,
  `active` int(11) NOT NULL DEFAULT '0',
  `downloaded` int(11) NOT NULL DEFAULT '0',
  `failed` int(11) NOT NULL DEFAULT '0',
  `installed` int(11) NOT NULL DEFAULT '0',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packageId_appVersion` (`packageId`, `appVersion`),
  CONSTRAINT `package_metrics_ibfk_1` FOREIGN KEY (`packageId`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- User collaborations table
CREATE TABLE IF NOT EXISTS `collaborations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `appId` int(11) NOT NULL,
  `roles` text,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId_appId` (`userId`, `appId`),
  KEY `appId` (`appId`),
  CONSTRAINT `collaborations_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `collaborations_ibfk_2` FOREIGN KEY (`appId`) REFERENCES `apps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Client deployment status table
CREATE TABLE IF NOT EXISTS `client_deployment_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clientUniqueId` varchar(255) NOT NULL,
  `deploymentKey` varchar(255) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `status` enum('DeploymentSucceeded','DeploymentFailed','Downloaded','Installing') DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `clientUniqueId` (`clientUniqueId`),
  KEY `deploymentKey` (`deploymentKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO `users` (`email`, `password`) VALUES 
('admin@carpool.local', '$2b$10$9XpTpKFhKdWbKcQ8W.Jt5.rQKW5zF3oGJ9QKdLgNd1QyQb8VhPQCu');

-- Insert CarpSchool apps
INSERT IGNORE INTO `apps` (`name`, `os`, `platform`) VALUES 
('CarpSchool', 'iOS', 'React Native'),
('CarpSchool', 'Android', 'React Native');

-- Create deployments for the apps
INSERT IGNORE INTO `deployments` (`name`, `key_`, `appId`) VALUES 
('Production', 'iOS-Production-Key-Change-In-Production', (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='iOS')),
('Staging', 'iOS-Staging-Key-Change-In-Production', (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='iOS')),
('Production', 'Android-Production-Key-Change-In-Production', (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='Android')),
('Staging', 'Android-Staging-Key-Change-In-Production', (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='Android'));

-- Grant admin user access to all apps
INSERT IGNORE INTO `collaborations` (`userId`, `appId`, `roles`) VALUES 
((SELECT id FROM `users` WHERE email='admin@carpool.local'), (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='iOS'), '["Owner"]'),
((SELECT id FROM `users` WHERE email='admin@carpool.local'), (SELECT id FROM `apps` WHERE name='CarpSchool' AND os='Android'), '["Owner"]');
