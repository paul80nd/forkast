Feature: Plan a week of meals
  As someone planning the household's week
  I want to add recipes to a plan, set portions, and mark meals cooked
  So that the plan reflects what we'll actually eat and what we've already had

  Background:
    Given the current plan is empty

  Scenario: Adding a recipe puts it on the plan
    When I add recipe "r1" to the plan
    Then the plan contains "r1"
    And the plan caters for 2

  Scenario: Adding the same recipe twice keeps a single copy
    Given I have added recipe "r1" to the plan
    When I add recipe "r1" to the plan
    Then the plan contains "r1" exactly once

  Scenario: Removing a recipe takes it off the plan
    Given I have added recipe "r1" to the plan
    When I remove recipe "r1" from the plan
    Then the plan does not contain "r1"

  Scenario: Changing the portions scales the whole plan
    When I set the plan to cater for 4
    Then the plan caters for 4

  Scenario: Marking a recipe cooked records history and clears it from the plan
    Given I have added recipe "r1" to the plan
    When I mark recipe "r1" as cooked
    Then the cooked history holds 1 entry for "r1"
    And the plan does not contain "r1"
