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

  Scenario: Overriding one meal's portions leaves the rest at the default
    Given the plan is exactly "r1, r2"
    When I set recipe "r1" to cater for 4
    Then meal "r1" caters for 4
    And meal "r2" caters for 2
    And the plan caters for 2

  Scenario: Setting a meal back to the default clears its override
    Given the plan is exactly "r1"
    And I set recipe "r1" to cater for 4
    When I set recipe "r1" to cater for 2
    Then meal "r1" has no portions override

  Scenario: Removing a meal drops its portions override
    Given the plan is exactly "r1, r2"
    And I set recipe "r1" to cater for 6
    When I remove recipe "r1" from the plan
    Then meal "r1" has no portions override

  Scenario: Swapping a meal for a variant carries its portions override
    Given the plan is exactly "r1, r2"
    And I set recipe "r1" to cater for 6
    When I swap planned recipe "r1" for "r1b"
    Then meal "r1b" caters for 6
    And meal "r1" has no portions override

  Scenario: Marking a recipe cooked records history and clears it from the plan
    Given I have added recipe "r1" to the plan
    When I mark recipe "r1" as cooked
    Then the cooked history holds 1 entry for "r1"
    And the plan does not contain "r1"

  Scenario: Undoing a remove restores the meal to its original slot
    Given the plan is exactly "r1, r2, r3"
    When I remove recipe "r2" from the plan
    And I re-insert recipe "r2" at slot 1
    Then the plan is exactly "r1, r2, r3"

  Scenario: Undoing a cook removes the stamp and restores the meal
    Given I have added recipe "r1" to the plan
    When I mark recipe "r1" as cooked
    And I unmark the last cook
    And I re-insert recipe "r1" at slot 0
    Then the cooked history holds 0 entry for "r1"
    And the plan is exactly "r1"

  Scenario: Swapping a planned meal for a variant keeps its slot position
    Given I have added recipe "r1" to the plan
    And I have added recipe "r2" to the plan
    When I swap planned recipe "r1" for "r1b"
    Then the plan is exactly "r1b, r2"

  Scenario: Swapping to an already-planned recipe is a no-op
    Given I have added recipe "r1" to the plan
    And I have added recipe "r2" to the plan
    When I swap planned recipe "r1" for "r2"
    Then the plan is exactly "r1, r2"
