Feature: Save and restore a backup
  As someone refining my own recipe collection
  I want to save a complete backup and restore it
  So that I never lose my deletions, groups and stars

  Background:
    Given the app starts with no data

  Scenario: A backup round-trips the whole collection
    Given a curated collection of 3 recipes with a star, a plan and a group
    When I save a backup
    And I wipe all data
    And I open that backup
    Then the collection is restored exactly

  Scenario: Opening a backup replaces the current data
    Given a curated collection of 3 recipes with a star, a plan and a group
    And I have saved a backup
    When I import a different dataset of 2 recipes
    And I open that backup
    Then the collection is restored exactly

  Scenario: A restore preserves an in-app deletion
    Given a curated collection of 3 recipes with a star, a plan and a group
    When I delete one recipe
    And I save a backup
    And I wipe all data
    And I open that backup
    Then the app holds 2 recipes
    And the deleted recipe is still gone
