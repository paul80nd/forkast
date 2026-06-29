Feature: Seed the demo dataset on first run
  As a first-time visitor with no data of my own
  I want the bundled demo recipes to load automatically
  So that the app is never empty before I import my own collection

  Background:
    Given the store is completely empty

  Scenario: First run on an empty store seeds the demo recipes
    Given the bundled demo dataset has 3 recipes
    When the app runs its first-run seed
    Then the app holds 3 recipes
    And the data source is marked as demo

  Scenario: A newer demo version refreshes existing demo data
    Given the store holds demo data from an older version
    And the bundled demo dataset has 3 recipes
    When the app runs its first-run seed
    Then the app holds 3 recipes
    And the data source is marked as demo
