Feature: Import a recipe dataset
  As someone curating my own recipe collection
  I want to import a recipe dataset into the app
  So that I can browse, curate and plan from my own recipes instead of the demo set

  Background:
    Given the app starts with no recipes

  Scenario: Importing a valid dataset loads every recipe
    When I import a dataset of 3 valid recipes
    Then the app holds 3 recipes
    And the data source is marked as user-owned

  Scenario: My imported data survives the first-run demo seed
    Given I have imported a dataset of 3 valid recipes
    When the app runs its first-run demo seed
    Then the app still holds 3 recipes
    And the data source is marked as user-owned

  Scenario: A malformed recipe is skipped, not fatal
    When I import a dataset of 3 recipes where 1 is missing its title
    Then the app holds 2 recipes
    And the import reports 1 skipped recipe

  Scenario: Importing replaces any previously loaded recipes
    Given I have imported a dataset of 3 valid recipes
    When I import a dataset of 2 valid recipes
    Then the app holds 2 recipes
