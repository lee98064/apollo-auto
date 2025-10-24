-- Convert Job.startAt and Job.endAt to HH:mm CHAR(5) strings.

ALTER TABLE `Job`
  ADD COLUMN `startAt_tmp` CHAR(5) NULL,
  ADD COLUMN `endAt_tmp` CHAR(5) NULL;

UPDATE `Job`
SET
  `startAt_tmp` = DATE_FORMAT(`startAt`, '%H:%i'),
  `endAt_tmp` = CASE
    WHEN `endAt` IS NULL THEN NULL
    ELSE DATE_FORMAT(`endAt`, '%H:%i')
  END;

ALTER TABLE `Job`
  MODIFY `startAt_tmp` CHAR(5) NOT NULL;

ALTER TABLE `Job`
  DROP COLUMN `startAt`,
  DROP COLUMN `endAt`;

ALTER TABLE `Job`
  CHANGE COLUMN `startAt_tmp` `startAt` CHAR(5) NOT NULL,
  CHANGE COLUMN `endAt_tmp` `endAt` CHAR(5) NULL;
